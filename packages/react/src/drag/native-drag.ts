"use client";

import { warn } from "@dashfoo/core/internal";
import { useContext, useEffect, useMemo, useState } from "react";

import type { LayoutStore } from "../layout/layout-store";
import { LayoutStoreContext, useLayout } from "../layout/layout-store";
import { isHTMLElement, isNode } from "../lib/dom";

import { DragContext } from "./drag-context";
import type { InternalSubject, TransferNode } from "./drag-group";
import {
  appId,
  confirmAccepted,
  offerRelease,
  setRemoteDocument,
  sourceDocument,
  withdrawOffer,
} from "./drag-group";
import type { DragSession } from "./drag-session";
import type { Marker } from "./native-wire";
import { readMarker, readNode, writeTransfer } from "./native-wire";
import { nativeRelease } from "./tear-off";

/**
 * A cross-app drop confirms over a `BroadcastChannel`, which can land after
 * the source's `dragend`; tearing off before then would remove the node twice.
 */
const ACCEPT_GRACE_MS = 250;

/** A mouse press on a native source is the browser's drag and drop to run, so the pointer sensor leaves it alone. */
const isNativeSource = (element: Element | undefined): boolean =>
  element?.getAttribute("draggable") === "true";

/** Another copy of the app can mint the same React ids, so its documents are namespaced by app. */
const subjectOf = (marker: Marker): InternalSubject => ({
  documentId: marker.appId === appId() ? marker.documentId : `${marker.appId}/${marker.documentId}`,
  id: marker.id,
  kind: marker.kind,
});

type SourceOptions = { session: DragSession; store: LayoutStore; subject: InternalSubject };

const bindSource = (element: HTMLElement, { session, store, subject }: SourceOptions) => {
  let dragId: string | null = null;

  const handleDragStart = (event: DragEvent): void => {
    const { dragGroup, dragGroupScope } = store.getState();
    const source = sourceDocument(subject.documentId);
    const node = source?.take(subject);

    if (!source || !node || !event.dataTransfer || dragGroup === undefined) {
      event.preventDefault();

      return;
    }

    event.stopPropagation();
    dragId = crypto.randomUUID();

    const marker: Marker = {
      appId: appId(),
      dragId,
      group: dragGroup,
      origin: location.origin,
      scope: dragGroupScope,
      ...subject,
    };

    writeTransfer(event.dataTransfer, marker, node);
    offerRelease(dragId, () => {
      source.release(subject);
    });
    session.start(subject, "own");
  };

  const handleDragEnd = (event: DragEvent): void => {
    session.cancel();

    const id = dragId;
    const view = element.ownerDocument.defaultView;
    const released = event.dataTransfer?.dropEffect !== "none";

    const tearOff =
      released || !view ? null : session.tearOff(subject, element, nativeRelease(event, view));

    setTimeout(() => {
      if (id !== null && withdrawOffer(id)) {
        tearOff?.();
      }
    }, ACCEPT_GRACE_MS);
  };

  element.setAttribute("draggable", "true");
  element.addEventListener("dragstart", handleDragStart);
  element.addEventListener("dragend", handleDragEnd);

  return () => {
    element.removeAttribute("draggable");
    element.removeEventListener("dragstart", handleDragStart);
    element.removeEventListener("dragend", handleDragEnd);
  };
};

type TargetOptions = { layerId: string; session: DragSession; tabsetId: string };

const bindTarget = (element: HTMLElement, { layerId, session, tabsetId }: TargetOptions) => {
  let remoteNode: TransferNode | undefined;
  let remoteDragId: string | null = null;

  const adopt = (marker: Marker): InternalSubject => {
    const subject = subjectOf(marker);

    if (marker.appId !== appId() && marker.dragId !== remoteDragId) {
      remoteDragId = marker.dragId;
      remoteNode = undefined;
      setRemoteDocument({
        appId: marker.appId,
        documentId: subject.documentId,
        group: marker.group,
        release: () => {
          confirmAccepted(marker.dragId);
        },
        scope: marker.scope,
        take: () => remoteNode,
      });
    }

    return subject;
  };

  const resolve = (event: DragEvent): boolean => {
    const marker = readMarker(event.dataTransfer);

    if (!marker) {
      return false;
    }

    session.start(adopt(marker));

    return session.over({
      element,
      layerId,
      point: { x: event.clientX, y: event.clientY },
      tabsetId,
    });
  };

  const handleDragOver = (event: DragEvent): void => {
    if (resolve(event) && event.dataTransfer) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };

  const handleDragLeave = (event: DragEvent): void => {
    const next = event.relatedTarget;

    if (isNode(next) && element.contains(next)) {
      return;
    }

    if (next === null && !session.startedHere()) {
      session.cancel();

      return;
    }

    session.over(null);
  };

  const handleDrop = (event: DragEvent): void => {
    event.preventDefault();

    if (!resolve(event)) {
      return;
    }

    remoteNode = readNode(event.dataTransfer);

    if (remoteNode === undefined) {
      warn("a dragged node arrived without valid data; the drop was ignored");
      session.cancel();

      return;
    }

    session.drop();
    setRemoteDocument(null);
    remoteDragId = null;
  };

  element.addEventListener("dragenter", handleDragOver);
  element.addEventListener("dragover", handleDragOver);
  element.addEventListener("dragleave", handleDragLeave);
  element.addEventListener("drop", handleDrop);

  return () => {
    element.removeEventListener("dragenter", handleDragOver);
    element.removeEventListener("dragover", handleDragOver);
    element.removeEventListener("dragleave", handleDragLeave);
    element.removeEventListener("drop", handleDrop);
  };
};

/** The layer, session and element a native binding needs; `null` until all are there and the layout is grouped. */
const useGroupedElement = () => {
  const context = useContext(DragContext);
  const store = useContext(LayoutStoreContext);
  const [element, setElement] = useState<Element | null>(null);
  const grouped = useLayout((state) => state.dragGroup !== undefined);
  const layerId = context?.layerId ?? null;

  const binding =
    grouped && store && context && layerId !== null && isHTMLElement(element)
      ? { element, layerId, session: context.session, store }
      : null;

  return { binding, setElement };
};

/** Mouse drags in a drag group use the browser's drag and drop, the only kind that crosses windows. */
const useNativeSource = (
  kind: "tab" | "tabset",
  id: string,
  disabled: boolean,
): ((element: Element | null) => void) => {
  const { binding, setElement } = useGroupedElement();
  const documentId = useLayout((state) => state.documentId);
  const subject = useMemo(() => ({ documentId, id, kind }), [documentId, id, kind]);
  const { element, session, store } = binding ?? {};

  useEffect(() => {
    if (!element || !session || !store || disabled) {
      return undefined;
    }

    return bindSource(element, { session, store, subject });
  }, [disabled, element, session, store, subject]);

  return setElement;
};

const useNativeTarget = (tabsetId: string): ((element: Element | null) => void) => {
  const { binding, setElement } = useGroupedElement();
  const { element, layerId, session } = binding ?? {};

  useEffect(() => {
    if (!element || !session || layerId === undefined) {
      return undefined;
    }

    return bindTarget(element, { layerId, session, tabsetId });
  }, [element, layerId, session, tabsetId]);

  return setElement;
};

export { isNativeSource, useNativeSource, useNativeTarget };

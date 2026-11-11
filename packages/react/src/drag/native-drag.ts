"use client";

import type { DragSubject } from "@dashfoo/core";
import { warn } from "@dashfoo/core";
import { useContext, useEffect, useMemo, useState } from "react";

import type { LayoutStore } from "../layout/layout-store";
import { LayoutStoreContext, useLayout } from "../layout/layout-store";
import { isHTMLElement, isNode } from "../lib/dom";

import type { DragActor } from "./drag-context";
import { DragContext } from "./drag-context";
import type { InternalSubject, TransferNode } from "./drag-group";
import { appId, setRemoteDocument, sourceDocument } from "./drag-group";
import { createLayer, tearOffHandler } from "./drag-layer";
import type { Marker } from "./native-wire";
import { readAccepted, readMarker, readNode, writeTransfer } from "./native-wire";

/**
 * A cross-app drop confirms over a `BroadcastChannel`, which can land after
 * the source's `dragend`; tearing off before then would remove the node twice.
 */
const ACCEPT_GRACE_MS = 250;

const CHANNEL_NAME = "dashfoo-drag";

/** Another copy of the app can mint the same React ids, so its documents are namespaced by app. */
const subjectOf = (marker: Marker): InternalSubject => ({
  documentId: marker.appId === appId() ? marker.documentId : `${marker.appId}/${marker.documentId}`,
  id: marker.id,
  kind: marker.kind,
});

const pendingReleases = new Map<string, () => void>();

let channel: BroadcastChannel | null = null;

const acceptChannel = (): BroadcastChannel | null => {
  if (channel === null && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      const dragId = readAccepted(event);

      if (dragId !== undefined) {
        pendingReleases.get(dragId)?.();
        pendingReleases.delete(dragId);
      }
    });
  }

  return channel;
};

/** The actor of the drag root that started the current native drag in this window, if any. */
let sourceActor: DragActor | null = null;

const startDrag = (actorRef: DragActor, subject: DragSubject): void => {
  const { drag } = actorRef.getSnapshot().context;

  if (drag.kind === "dragging" && JSON.stringify(drag.subject) === JSON.stringify(subject)) {
    return;
  }

  actorRef.send({ type: "CANCEL" });
  actorRef.send({ subject, type: "START" });
};

const isInsideWindow = (event: DragEvent, view: Window): boolean =>
  event.screenX >= view.screenX &&
  event.screenX < view.screenX + view.outerWidth &&
  event.screenY >= view.screenY &&
  event.screenY < view.screenY + view.outerHeight;

type SourceOptions = { actorRef: DragActor; store: LayoutStore; subject: InternalSubject };

const bindSource = (element: HTMLElement, { actorRef, store, subject }: SourceOptions) => {
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
    pendingReleases.set(dragId, () => {
      source.release(subject);
    });
    acceptChannel();
    sourceActor = actorRef;
    startDrag(actorRef, subject);
  };

  const handleDragEnd = (event: DragEvent): void => {
    sourceActor = null;

    if (actorRef.getSnapshot().context.drag.kind === "dragging") {
      actorRef.send({ type: "CANCEL" });
    }

    const id = dragId;
    const view = element.ownerDocument.defaultView;
    const released = event.dataTransfer?.dropEffect !== "none";
    const tearOff = released || !view || isInsideWindow(event, view) ? null : tearOffHandler(store);
    const point = { x: event.screenX, y: event.screenY };

    setTimeout(() => {
      if (id === null || !pendingReleases.has(id)) {
        return;
      }

      pendingReleases.delete(id);
      tearOff?.(subject, element, point);
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

type TargetOptions = { actorRef: DragActor; layerId: string; store: LayoutStore; tabsetId: string };

const bindTarget = (
  element: HTMLElement,
  { actorRef, layerId, store, tabsetId }: TargetOptions,
) => {
  const layer = createLayer(layerId, store);
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
          acceptChannel()?.postMessage({ accepted: marker.dragId });
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

    const subject = adopt(marker);
    startDrag(actorRef, subject);
    const point = { x: event.clientX, y: event.clientY };
    const resolved = layer.resolveDrop(subject, tabsetId, element, point);
    actorRef.send({ drop: resolved && { ...resolved, scope: layerId }, type: "OVER" });

    return resolved !== null;
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

    if (next === null && sourceActor !== actorRef) {
      actorRef.send({ type: "CANCEL" });

      return;
    }

    actorRef.send({ drop: null, type: "OVER" });
  };

  const handleDrop = (event: DragEvent): void => {
    event.preventDefault();

    if (!resolve(event)) {
      return;
    }

    remoteNode = readNode(event.dataTransfer);

    if (remoteNode === undefined) {
      warn("a dragged node arrived without valid data; the drop was ignored");
      actorRef.send({ type: "CANCEL" });

      return;
    }

    actorRef.send({ type: "DROP" });
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

/** The layer, store and element a native binding needs; `null` until all are there and the layout is grouped. */
const useGroupedElement = () => {
  const context = useContext(DragContext);
  const store = useContext(LayoutStoreContext);
  const [element, setElement] = useState<Element | null>(null);
  const grouped = useLayout((state) => state.dragGroup !== undefined);
  const layerId = context?.layerId ?? null;

  const binding =
    grouped && store && context && layerId !== null && isHTMLElement(element)
      ? { actorRef: context.actorRef, element, layerId, store }
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
  const { actorRef, element, store } = binding ?? {};

  useEffect(() => {
    if (!actorRef || !element || !store || disabled) {
      return undefined;
    }

    return bindSource(element, { actorRef, store, subject });
  }, [actorRef, disabled, element, store, subject]);

  return setElement;
};

const useNativeTarget = (tabsetId: string): ((element: Element | null) => void) => {
  const { binding, setElement } = useGroupedElement();
  const { actorRef, element, layerId, store } = binding ?? {};

  useEffect(() => {
    if (!actorRef || !element || !store || layerId === undefined) {
      return undefined;
    }

    return bindTarget(element, { actorRef, layerId, store, tabsetId });
  }, [actorRef, element, layerId, store, tabsetId]);

  return setElement;
};

export { useNativeSource, useNativeTarget };

"use client";

import type { Action, DragSubject, Point } from "@dashfoo/core";
import { dropIndicator, resolveDropIntent, standaloneModel, warn, warnOnce } from "@dashfoo/core";
import type { ReactNode } from "react";
import { useContext, useEffect, useId, useMemo } from "react";

import type { LayoutState, LayoutStore } from "../layout/layout-store";
import { LayoutStoreContext } from "../layout/layout-store";
import { measureTabset } from "../tabset/measure-tabset";

import { DockIndicator } from "./dock-indicator";
import type { DragContextValue, RegisteredLayer } from "./drag-context";
import { DragContext } from "./drag-context";
import type { InternalSubject } from "./drag-group";
import { canExchange, collides, localModel, sourceDocument } from "./drag-group";
import type { TearOffRequest } from "./tear-off";

type DragLayerProps = { children: ReactNode };

const isForeign = (state: LayoutState, subject: DragSubject): subject is InternalSubject =>
  subject.kind !== "external" && subject.documentId !== state.documentId;

/** A foreign node is acceptable from a source in the same drag group, unless its tab ids are taken here. */
const canDrop = (state: LayoutState, subject: DragSubject): boolean => {
  if (!state.canDock) {
    return false;
  }

  if (!isForeign(state, subject)) {
    return true;
  }

  const source = sourceDocument(subject.documentId);

  if (!source || !canExchange({ group: state.dragGroup, scope: state.dragGroupScope }, source)) {
    return false;
  }

  const node = source.take(subject);
  const model = localModel(state.documentId);

  return node === undefined || model === undefined || !collides(model, node);
};

/** A move whose source lives in another layout lands as a `transferIn` here and a `transferOut` there. */
const transfer = (state: LayoutState, action: Action, subject: InternalSubject): void => {
  if (action.type !== "moveNode" && action.type !== "moveTabset") {
    return;
  }

  const source = sourceDocument(subject.documentId);
  const node = source?.take(subject);
  const model = localModel(state.documentId);

  if (!source || !node || (model && collides(model, node))) {
    warn(`transfer of "${subject.id}" dropped: its source no longer offers it`);

    return;
  }

  state.dispatch({
    index: action.type === "moveNode" ? action.index : undefined,
    location: action.location,
    node,
    targetId: action.targetId,
    type: "transferIn",
  });
  source.release(subject);
};

const measuredSize = (element: Element | null): TearOffRequest["size"] => {
  const rect = element?.closest('[data-dashfoo="tabset"]')?.getBoundingClientRect();

  return { height: rect?.height ?? 0, width: rect?.width ?? 0 };
};

type TearOff = (subject: InternalSubject, source: Element | null, screen: Point) => void;

/** `null` when the layout takes no tear-offs. */
const tearOffHandler = (store: LayoutStore): TearOff | null => {
  const { canDock, dispatch, documentId, onTearOff } = store.getState();

  if (!canDock || !onTearOff) {
    return null;
  }

  return (subject, source, screen) => {
    const model = localModel(documentId);
    const detached = model && standaloneModel(model, subject.id);

    if (
      detached &&
      onTearOff({
        kind: subject.kind,
        model: detached,
        nodeId: subject.id,
        point: screen,
        size: measuredSize(source),
      })
    ) {
      dispatch({ nodeId: subject.id, type: "tearOff" });
    }
  };
};

const createLayer = (layerId: string, store: LayoutStore): RegisteredLayer => ({
  commit: (action, subject) => {
    const state = store.getState();

    if (!canDrop(state, subject)) {
      return;
    }

    if (isForeign(state, subject)) {
      transfer(state, action, subject);
    } else {
      state.dispatch(action);
    }
  },
  documentId: () => store.getState().documentId,
  layerId,
  resolveDrop: (subject, tabsetId, element, point) => {
    const state = store.getState();

    if (!canDrop(state, subject)) {
      return null;
    }

    const tabset = measureTabset(tabsetId, element);

    const intent = resolveDropIntent(subject, tabset, point, {
      foreign: isForeign(state, subject),
      splitDock: state.splitDock && element.dataset.dashfoo !== "layout-empty",
    });

    return intent && { indicator: dropIndicator(subject, tabset, intent), intent };
  },
  tearOff: () => tearOffHandler(store),
});

/** One drag layer: the main tree, or one float. Holds no drag state of its own. */
const DragLayer = ({ children }: DragLayerProps): ReactNode => {
  const root = useContext(DragContext);
  const store = useContext(LayoutStoreContext);
  const layerId = useId();

  const registerLayer = root?.registerLayer;
  useEffect(() => {
    if (!registerLayer || !store) {
      warnOnce(
        "drag-layer-no-root",
        "Layout.DragLayer is not inside a <Layout.Root>; its tabsets cannot be dragged or dropped on",
      );

      return undefined;
    }

    return registerLayer(createLayer(layerId, store));
  }, [layerId, registerLayer, store]);

  const layer = useMemo<DragContextValue | null>(
    () => (root === null || store === null ? null : { ...root, layerId }),
    [layerId, root, store],
  );

  if (layer === null) {
    return children;
  }

  return (
    <DragContext.Provider value={layer}>
      {children}
      <DockIndicator actorRef={layer.actorRef} layerId={layerId} />
    </DragContext.Provider>
  );
};

export { createLayer, DragLayer, tearOffHandler };

export type { DragLayerProps };

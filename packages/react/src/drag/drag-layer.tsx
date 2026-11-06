"use client";

import type { DragSubject } from "@dashfoo/core";
import { dropIndicator, resolveDropIntent, warnOnce } from "@dashfoo/core";
import type { ReactNode } from "react";
import { useContext, useEffect, useId, useMemo } from "react";

import type { LayoutState, LayoutStore } from "../layout/layout-store";
import { LayoutStoreContext } from "../layout/layout-store";
import { measureTabset } from "../tabset/measure-tabset";

import { DockIndicator } from "./dock-indicator";
import type { DragContextValue, RegisteredLayer } from "./drag-context";
import { DragContext } from "./drag-context";

type DragLayerProps = { children: ReactNode };

const canDrop = ({ canDock, documentId }: LayoutState, subject: DragSubject): boolean =>
  canDock && (subject.kind === "external" || subject.documentId === documentId);

const createLayer = (layerId: string, store: LayoutStore): RegisteredLayer => ({
  commit: (action, subject) => {
    const state = store.getState();

    if (canDrop(state, subject)) {
      state.dispatch(action);
    }
  },
  layerId,
  resolveDrop: (subject, tabsetId, element, point) => {
    const state = store.getState();

    if (!canDrop(state, subject)) {
      return null;
    }

    const tabset = measureTabset(tabsetId, element);
    const intent = resolveDropIntent(subject, tabset, point, { splitDock: state.splitDock });

    return intent && { indicator: dropIndicator(subject, tabset, intent), intent };
  },
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

export { createLayer, DragLayer };

export type { DragLayerProps };

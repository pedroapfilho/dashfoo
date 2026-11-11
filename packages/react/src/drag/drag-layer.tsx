"use client";

import type { DragSubject } from "@dashfoo/core";
import { dropIndicator, resolveDropIntent, warnOnce } from "@dashfoo/core";
import type { ReactNode } from "react";
import { useContext, useEffect, useId, useMemo } from "react";

import { InsideFloatContext } from "../float/float-context";
import type { LayoutState, LayoutStore } from "../layout/layout-store";
import { LayoutStoreContext } from "../layout/layout-store";
import { measureLayout, measureTabset } from "../tabset/measure-tabset";

import type { DragContextValue, RegisteredLayer } from "./drag-context";
import { DragContext } from "./drag-context";

type DragLayerProps = { children: ReactNode };

const canDrop = ({ canDock, documentId }: LayoutState, subject: DragSubject): boolean =>
  canDock && (subject.kind === "external" || subject.documentId === documentId);

const createLayer = (layerId: string, store: LayoutStore, floating = false): RegisteredLayer => ({
  commit: (action, subject) => {
    const state = store.getState();

    if (canDrop(state, subject)) {
      state.dispatch(action);
    }
  },
  floating,
  layerId,
  resolveDrop: (subject, tabsetId, element, point) => {
    const state = store.getState();

    if (!canDrop(state, subject)) {
      return null;
    }

    const tabset = measureTabset(tabsetId, element);

    const edges = state.edgeDocking ? measureLayout(element) : null;
    const options = { edges: edges ?? undefined, splitDock: state.splitDock };

    const intent = resolveDropIntent(subject, tabset, point, options);

    return intent && { indicator: dropIndicator(subject, tabset, intent, options), intent };
  },
});

/** One drag layer: the main tree, or one float. Holds no drag state of its own. */
const DragLayer = ({ children }: DragLayerProps): ReactNode => {
  const root = useContext(DragContext);
  const store = useContext(LayoutStoreContext);
  const layerId = useId();
  const floating = useContext(InsideFloatContext);

  const registerLayer = root?.registerLayer;
  useEffect(() => {
    if (!registerLayer || !store) {
      warnOnce(
        "drag-layer-no-root",
        "Layout.DragLayer is not inside a <Layout.Root>; its tabsets cannot be dragged or dropped on",
      );

      return undefined;
    }

    return registerLayer(createLayer(layerId, store, floating));
  }, [floating, layerId, registerLayer, store]);

  const layer = useMemo<DragContextValue | null>(
    () => (root === null || store === null ? null : { ...root, layerId }),
    [layerId, root, store],
  );

  if (layer === null) {
    return children;
  }

  return <DragContext.Provider value={layer}>{children}</DragContext.Provider>;
};

export { createLayer, DragLayer };

export type { DragLayerProps };

"use client";

import { resolveDropIntent, warnOnce } from "@dashfoo/core";
import type { ReactNode } from "react";
import { useContext, useEffect, useId, useMemo } from "react";

import type { LayoutStore } from "../hooks/layout-store";
import { LayoutStoreContext } from "../hooks/layout-store";

import { DockIndicator } from "./dock-indicator";
import type { DragContextValue, RegisteredLayer } from "./drag-context";
import { DragContext } from "./drag-context";
import { measureTabset } from "./measure-tabset";

type DragLayerProps = { children: ReactNode };

/** Read at drag time, so a layout that turns static mid-drag neither resolves nor commits. */
const createLayer = (layerId: string, store: LayoutStore): RegisteredLayer => ({
  commit: (action) => {
    const { dispatch, editable } = store.getState();
    if (editable) {
      dispatch(action);
    }
  },
  layerId,
  resolveIntent: (subject, tabsetId, element, point) => {
    const { editable, splitDock } = store.getState();
    return editable
      ? resolveDropIntent(subject, measureTabset(tabsetId, element), point, { splitDock })
      : null;
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
      <DockIndicator context={layer} layerId={layerId} />
    </DragContext.Provider>
  );
};

export { DragLayer };
export type { DragLayerProps };

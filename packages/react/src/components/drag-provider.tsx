"use client";

import type { Action, DropIntent, Point } from "@dashfoo/core";
import { resolveDockTarget, splitEdge } from "@dashfoo/core";
import type { ReactNode } from "react";
import { useCallback, useContext, useEffect, useId, useMemo, useState } from "react";

import type { DragContextValue, DragScope } from "../hooks/drag-hooks";
import { DragContext, DragRootContext } from "../hooks/drag-hooks";
import { LayoutStoreContext } from "../hooks/layout-store";
import { insertionIndex, pointInRect, shouldAllowDrop } from "../lib/tab-insertion";
import { warnOnce } from "../lib/warn-once";

import { DashfooDragProvider } from "./dashfoo-drag-provider";
import { DockIndicator } from "./drag-preview-overlay";

const MISSING_ROOT =
  "[dashfoo] DashfooDragProvider unmounted while its layout is still mounted; keep the provider above the layout or remount the layout";

type StripMeasurement = { rect: DOMRect; tabIds: Array<string>; tabRects: Array<DOMRect> };

/** One DOM pass per pointer move, where resolving a drop used to run three. */
const measureStrip = (element: HTMLElement, excludeId?: string): StripMeasurement | null => {
  const strip = element.querySelector('[data-dashfoo="tabstrip"]');
  if (!strip) {
    return null;
  }
  const tabIds: Array<string> = [];
  const tabRects: Array<DOMRect> = [];
  for (const tab of strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')) {
    const tabId = tab.dataset.tabId ?? "";
    tabIds.push(tabId);
    if (tabId !== excludeId) {
      tabRects.push(tab.getBoundingClientRect());
    }
  }
  return { rect: strip.getBoundingClientRect(), tabIds, tabRects };
};

const intentForTabset = (
  id: string,
  element: HTMLElement,
  point: Point,
  strip: StripMeasurement | null,
): DropIntent => {
  if (strip && pointInRect(point, strip.rect)) {
    return {
      index: insertionIndex(strip.tabRects, point.x),
      location: "center",
      targetId: id,
    };
  }
  const location = resolveDockTarget(point, element.getBoundingClientRect());
  if (location === "center" && strip) {
    return { index: strip.tabRects.length, location, targetId: id };
  }
  return { location, targetId: id };
};

type DragProviderProps = {
  children: ReactNode;

  onCommit?: (action: Action) => void;

  splitDock?: boolean;
};

/** One drag layer (the main tree, or one float). Holds no drag state of its own. */
const DragScope = ({ children, onCommit, splitDock }: DragProviderProps): ReactNode => {
  const root = useContext(DragRootContext);
  const layoutStore = useContext(LayoutStoreContext);
  const layerId = useId();

  const manager = root?.manager;
  const getTabsetElement = useCallback(
    (id: string): HTMLElement | undefined => {
      const element = manager?.registry.droppables.get(`${layerId}:${id}`)?.element;
      return element instanceof HTMLElement ? element : undefined;
    },
    [layerId, manager],
  );

  const scope = useMemo<DragScope>(
    () => ({
      commit: (action) => {
        if (layoutStore?.getState().editable === false) {
          return;
        }
        const commit = onCommit ?? layoutStore?.getState().dispatch;
        if (!commit) {
          warnOnce(
            "drag-layer-no-commit",
            "Layout.DragLayer has neither an onCommit prop nor a <Layout.Root> above it; drops are ignored",
          );
          return;
        }
        commit(action);
      },
      layerId,
      resolveIntent: (targetId, element, point, draggedId) => {
        if (layoutStore?.getState().editable === false) {
          return null;
        }
        const strip = measureStrip(element, draggedId);
        if (!shouldAllowDrop(draggedId, targetId, strip?.tabIds ?? [])) {
          return null;
        }
        const intent = intentForTabset(targetId, element, point, strip);

        const splitDockResolved = splitDock ?? layoutStore?.getState().splitDock ?? true;
        if (!splitDockResolved && splitEdge(intent.location) !== undefined) {
          return { location: "center", targetId };
        }
        return intent;
      },
    }),
    [layerId, layoutStore, onCommit, splitDock],
  );

  const registerScope = root?.registerScope;
  useEffect(() => registerScope?.(scope), [registerScope, scope]);

  const contextValue = useMemo<DragContextValue | null>(
    () => (root === null ? null : { actorRef: root.actorRef, layerId, manager: root.manager }),
    [layerId, root],
  );

  if (contextValue === null) {
    throw new Error(MISSING_ROOT);
  }

  return (
    <DragContext.Provider value={contextValue}>
      {children}
      <DockIndicator actorRef={contextValue.actorRef} getTabsetElement={getTabsetElement} />
    </DragContext.Provider>
  );
};

/**
 * Mounts its own root when there is none above it. Decided on the first render:
 * a root that disappears later means a torn-down tree, which `DragScope` reports.
 */
const DragProvider = (props: DragProviderProps): ReactNode => {
  const hasRoot = useContext(DragRootContext) !== null;
  const [ownsRoot] = useState(() => !hasRoot);
  const layer = <DragScope {...props} />;

  return ownsRoot ? <DashfooDragProvider>{layer}</DashfooDragProvider> : layer;
};

export {
  useDragSubject,
  useTabDraggable,
  useTabsetDraggable,
  useTabsetDroppable,
} from "../hooks/drag-hooks";
export { DragProvider };
export type { DragProviderProps };

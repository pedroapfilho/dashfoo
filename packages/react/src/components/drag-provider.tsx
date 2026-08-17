"use client";

import type { Action, DropIntent, Point } from "@dashfoo/core";
import { dockLocationFor, resolveDockTarget, splitEdge } from "@dashfoo/core";
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

const tabRects = (strip: Element, excludeId?: string): Array<DOMRect> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].flatMap((tab) =>
    tab.dataset.tabId === excludeId ? [] : [tab.getBoundingClientRect()],
  );

const intentForTabset = (
  id: string,
  element: HTMLElement,
  point: Point,
  draggedId?: string,
): DropIntent => {
  const strip = element.querySelector('[data-dashfoo="tabstrip"]');
  if (strip && pointInRect(point, strip.getBoundingClientRect())) {
    return {
      index: insertionIndex(tabRects(strip, draggedId), point.x),
      location: "center",
      targetId: id,
    };
  }
  const location = dockLocationFor(resolveDockTarget(point, element.getBoundingClientRect()));
  if (location === "center" && strip) {
    return { index: tabRects(strip, draggedId).length, location, targetId: id };
  }
  return { location, targetId: id };
};

type DragProviderProps = {
  children: ReactNode;

  onCommit?: (action: Action) => void;

  splitDock?: boolean;
};

/**
 * One drag layer: the main tree, or one float. It holds no drag state of its
 * own. It registers how its own tabsets turn a pointer into an intent and where
 * a committed action goes, then draws the indicator over its own droppables.
 */
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
        const tabIds = [...element.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].map(
          (tab) => tab.dataset.tabId ?? "",
        );
        if (!shouldAllowDrop(draggedId, targetId, tabIds)) {
          return null;
        }
        const intent = intentForTabset(targetId, element, point, draggedId);

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
 * Mounts its own root when there is none above it, so a hand-composed
 * `Layout.DragLayer` still works standalone. The choice is made on the first
 * render, as it was for the manager this used to create itself: a root that
 * disappears later means a torn-down tree, which `DragScope` reports.
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

"use client";

import type { Action, DragSubject, DropIntent, Point } from "@dashfoo/core";
import {
  dockLocationFor,
  dragDockMachine,
  resolveDockTarget,
  splitEdge,
  tabNodeSchema,
} from "@dashfoo/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/dom";
import { useActorRef } from "@xstate/react";
import type { ReactNode } from "react";
import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { DragContextValue } from "../hooks/drag-hooks";
import {
  createDragManager,
  createDragSubjectStore,
  DragContext,
  DragSubjectStoreContext,
  sameDragSubject,
  sameDropIntent,
  SharedDragManagerContext,
} from "../hooks/drag-hooks";
import { LayoutStoreContext } from "../hooks/layout-store";
import { insertionIndex, pointInRect, shouldAllowDrop } from "../lib/tab-insertion";
import { warnOnce } from "../lib/warn-once";

import { DockIndicator, DragPreviewOverlay } from "./drag-overlays";

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

const isTabFactory = (value: unknown): value is () => unknown => typeof value === "function";

const subjectFor = (source: {
  data?: Record<string, unknown>;
  id: string | number;
}): DragSubject | null => {
  const data = source.data;
  if (data?.type === "tabset") {
    return { id: String(data.tabsetId), kind: "tabset" };
  }
  if (data?.type === "external") {
    if (!isTabFactory(data.createTab)) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source is missing its createTab function");
      return null;
    }
    let candidate: unknown;
    try {
      candidate = data.createTab();
    } catch (error) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source createTab threw", error);
      return null;
    }
    const parsed = tabNodeSchema.safeParse(candidate);
    if (!parsed.success) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source returned an invalid tab", parsed.error);
      return null;
    }
    return { id: String(source.id), kind: "external", tab: parsed.data };
  }
  return { id: String(source.id), kind: "tab" };
};

type DragProviderProps = {
  children: ReactNode;

  onCommit?: (action: Action) => void;

  splitDock?: boolean;
};

const DragProvider = ({ children, onCommit, splitDock }: DragProviderProps): ReactNode => {
  const actorRef = useActorRef(dragDockMachine);

  const layoutStore = useContext(LayoutStoreContext);

  const sharedManager = useContext(SharedDragManagerContext);
  const [ownManager] = useState(() => (sharedManager ? null : createDragManager()));
  useInsertionEffect(() => () => ownManager?.destroy(), [ownManager]);
  const manager = sharedManager ?? ownManager;
  if (manager === null) {
    throw new Error(
      "[dashfoo] DashfooDragProvider unmounted while its layout is still mounted; keep the provider above the layout or remount the layout",
    );
  }

  const inheritedStore = useContext(DragSubjectStoreContext);
  const [subjectStore] = useState(() => inheritedStore ?? createDragSubjectStore());
  const ownerId = useId();
  useEffect(() => {
    const subscription = actorRef.subscribe((snapshot) => {
      const { intent, subject } = snapshot.context;
      const state = subjectStore.getState();
      if (intent !== null) {
        if (!sameDropIntent(state.intent, intent) || state.intentOwner !== ownerId) {
          subjectStore.setState({ intent, intentOwner: ownerId });
        }
      } else if (state.intent !== null && state.intentOwner === ownerId) {
        subjectStore.setState({ intent: null, intentOwner: null });
      }
      if (!sameDragSubject(subjectStore.getState().subject, subject)) {
        subjectStore.setState({ subject });
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [actorRef, ownerId, subjectStore]);

  const onCommitRef = useRef(onCommit);
  const splitDockRef = useRef(splitDock);
  useEffect(() => {
    onCommitRef.current = onCommit;
    splitDockRef.current = splitDock;
  });

  const getTabsetElement = useCallback(
    (id: string): HTMLElement | undefined => {
      const element = manager.registry.droppables.get(`${ownerId}:${id}`)?.element;
      return element instanceof HTMLElement ? element : undefined;
    },
    [manager, ownerId],
  );

  useEffect(() => {
    const subscription = actorRef.on("COMMIT", (emitted) => {
      if (layoutStore?.getState().editable === false) {
        return;
      }
      const commit = onCommitRef.current ?? layoutStore?.getState().dispatch;
      if (!commit) {
        warnOnce(
          "drag-layer-no-commit",
          "Layout.DragLayer has neither an onCommit prop nor a <Layout.Root> above it; drops are ignored",
        );
        return;
      }
      commit(emitted.action);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [actorRef, layoutStore]);

  useEffect(() => {
    const resolveIntent = (
      targetId: string,
      element: HTMLElement,
      point: Point,
      draggedId?: string,
    ): DropIntent | null => {
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

      const splitDockResolved = splitDockRef.current ?? layoutStore?.getState().splitDock ?? true;
      if (!splitDockResolved && splitEdge(intent.location) !== undefined) {
        return { location: "center", targetId };
      }
      return intent;
    };

    const handleStart = (event: DragStartEvent): void => {
      const source = event.operation.source;
      if (!source) {
        return;
      }
      const subject = subjectFor(source);
      if (!subject) {
        manager.actions.stop({ canceled: true });
        return;
      }
      actorRef.send({ subject, type: "START" });
    };

    const syncIntent = (): void => {
      const operation = manager.dragOperation;
      const point = operation.position.current;
      const target = operation.target;

      const data = target?.data as { layerId?: string; tabsetId?: string } | undefined;
      const tabsetId = data?.layerId === ownerId ? data.tabsetId : undefined;
      const element = tabsetId === undefined ? undefined : target?.element;
      const draggedId = operation.source ? String(operation.source.id) : undefined;
      actorRef.send({
        intent:
          tabsetId !== undefined && element instanceof HTMLElement
            ? resolveIntent(tabsetId, element, point, draggedId)
            : null,
        type: "OVER",
      });
    };

    const handleMove = (): void => {
      syncIntent();
    };
    const handleCollision = (): void => {
      syncIntent();
    };

    const handleEnd = (event: DragEndEvent): void => {
      if (event.canceled) {
        actorRef.send({ type: "CANCEL" });
        return;
      }
      syncIntent();
      actorRef.send({ type: "DROP" });
    };
    const offStart = manager.monitor.addEventListener("dragstart", handleStart);
    const offMove = manager.monitor.addEventListener("dragmove", handleMove);
    const offCollision = manager.monitor.addEventListener("collision", handleCollision);
    const offEnd = manager.monitor.addEventListener("dragend", handleEnd);
    return () => {
      offStart();
      offMove();
      offCollision();
      offEnd();
    };
  }, [actorRef, layoutStore, manager, ownerId]);

  const contextValue = useMemo<DragContextValue>(
    () => ({ layerId: ownerId, manager }),
    [manager, ownerId],
  );

  return (
    <DragContext.Provider value={contextValue}>
      <DragSubjectStoreContext.Provider value={subjectStore}>
        {children}
        <DockIndicator actorRef={actorRef} getTabsetElement={getTabsetElement} />
        {ownManager === null ? null : <DragPreviewOverlay manager={ownManager} />}
      </DragSubjectStoreContext.Provider>
    </DragContext.Provider>
  );
};

export {
  useDragSubject,
  useTabDraggable,
  useTabsetDraggable,
  useTabsetDroppable,
} from "../hooks/drag-hooks";
export { DragProvider, subjectFor };
export type { DragProviderProps };

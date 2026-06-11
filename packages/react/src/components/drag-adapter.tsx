"use client";

import type { Action, DockLocation, DragSubject, DropIntent, Point } from "@dashfoo/core";
import { dragDockMachine, resolveDockTarget, tabNodeSchema } from "@dashfoo/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/dom";
import { useActorRef, useSelector } from "@xstate/react";
import type { ReactNode } from "react";
import {
  useCallback,
  useContext,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { DragContextValue } from "../hooks/drag-hooks";
import {
  createDragManager,
  DragContext,
  DragSubjectContext,
  SharedDragManagerContext,
  useDragSubject,
  useTabDraggable,
  useTabsetDraggable,
  useTabsetDroppable,
} from "../hooks/drag-hooks";
import { insertionIndex, pointInRect, shouldAllowDrop } from "../lib/tab-insertion";

import type { DragPreviewState } from "./drag-overlays";
import { DockIndicator, DragPreview } from "./drag-overlays";

// This module is the drag adapter: it (with ./drag-hooks) is where @dnd-kit is
// touched. It wires the framework-agnostic @dnd-kit/dom core (no React bindings)
// to the already unit-tested dragDockMachine — the PointerSensor supplies
// activation + a live pointer, the adapter hit-tests that pointer against the
// registered tabsets, and the machine owns the lifecycle and emits a moveNode
// COMMIT forwarded via onCommit. The drag preview is our own overlay, so there is
// no Feedback plugin, no placeholder clone, and none of the CSS workarounds those
// required.

// The dragged tab is excluded so its own slot never counts toward the order —
// the insertion index and line are measured against the tabs it will land among.
const tabRects = (strip: Element, excludeId?: string): Array<DOMRect> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].flatMap((tab) =>
    tab.dataset.tabId === excludeId ? [] : [tab.getBoundingClientRect()],
  );

// The tab strip is always a "stack as a tab" target, with an insertion index that
// places the tab at a specific slot. Only the content area below it resolves to
// the center/split zones via resolveDockTarget (content center appends). The
// adapter gathers rects from the DOM; the pure math lives in ./tab-insertion.
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
  const target = resolveDockTarget(point, element.getBoundingClientRect());
  const location: DockLocation = target.kind === "tab" ? "center" : `split-${target.edge}`;
  if (location === "center" && strip) {
    return { index: tabRects(strip, draggedId).length, location, targetId: id };
  }
  return { location, targetId: id };
};

// The pointer-anchored preview chip follows the cursor at this offset.
const PREVIEW_OFFSET: Point = { x: 12, y: 8 };

const labelOf = (source: { data?: Record<string, unknown> } | null): string => {
  const raw = source?.data?.label;
  return typeof raw === "string" ? raw : "";
};

const isTabFactory = (value: unknown): value is () => unknown => typeof value === "function";

// A tabset grip carries { tabsetId, type: "tabset" }; an external source
// (useExternalTabSource) carries { createTab, type: "external" } and its tab is
// built and validated at drag start; a plain tab carries its id. null aborts
// the drag — the machine stays idle, so the following OVER/DROP are ignored.
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
      // A wired-up source that can't produce a tab must not fail silently.
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source is missing its createTab function");
      return null;
    }
    const parsed = tabNodeSchema.safeParse(data.createTab());
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
  onCommit: (action: Action) => void;
  splitDock?: boolean;
};

const DragProvider = ({ children, onCommit, splitDock = true }: DragProviderProps): ReactNode => {
  const actorRef = useActorRef(dragDockMachine);
  const dragSubject = useSelector(actorRef, (snapshot) => snapshot.context.subject);
  const tabsets = useRef(new Map<string, HTMLElement>());
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<DragPreviewState | null>(null);

  // One manager for the whole layout — the shared one when a DashfooDragProvider
  // sits above (so external sources participate in this layout's drags), else
  // our own. useState lazily constructs it once; the destroy rides a
  // useInsertionEffect cleanup (not useEffect) so StrictMode's simulated unmount
  // doesn't tear down the live instance — the same pattern @dnd-kit/react uses
  // internally.
  const sharedManager = useContext(SharedDragManagerContext);
  const [ownManager] = useState(() => (sharedManager ? null : createDragManager()));
  useInsertionEffect(() => () => ownManager?.destroy(), [ownManager]);
  const manager = sharedManager ?? ownManager;
  if (manager === null) {
    // Only reachable when a DashfooDragProvider unmounts while its layout stays
    // mounted — surface the misuse instead of dragging against a dead manager.
    throw new Error(
      "[dashfoo] DashfooDragProvider unmounted while its layout is still mounted; keep the provider above the layout or remount the layout",
    );
  }

  useEffect(() => {
    const subscription = actorRef.on("COMMIT", (emitted) => {
      onCommit(emitted.action);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [actorRef, onCommit]);

  const registerTabset = useCallback((id: string, element: HTMLElement | null): void => {
    if (element) {
      tabsets.current.set(id, element);
    } else {
      tabsets.current.delete(id);
    }
  }, []);

  const getTabsetElement = useCallback((id: string) => tabsets.current.get(id), []);

  // Which registered tabset sits under the pointer. Tabsets tile (never overlap),
  // so the first rect that contains the point is the unambiguous target — no
  // dnd-kit collision detection needed.
  const tabsetAt = useCallback((point: Point): { element: HTMLElement; id: string } | undefined => {
    for (const [id, element] of tabsets.current) {
      if (pointInRect(point, element.getBoundingClientRect())) {
        return { element, id };
      }
    }
    return undefined;
  }, []);

  // The dock intent for a pointer over a tabset, or null when the drop would be a
  // no-op: a tabset dragged onto itself, or the sole tab of a tabset dropped back
  // onto that same tabset. Otherwise the tabset resolves to center/split.
  const resolveIntent = useCallback(
    (
      targetId: string,
      element: HTMLElement,
      point: Point,
      draggedId?: string,
    ): DropIntent | null => {
      const tabIds = [...element.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].map(
        (tab) => tab.dataset.tabId ?? "",
      );
      if (!shouldAllowDrop(draggedId, targetId, tabIds)) {
        return null;
      }
      const intent = intentForTabset(targetId, element, point, draggedId);
      // When splitting is disabled, a drop over the body stacks instead of splits.
      if (!splitDock && intent.location.startsWith("split-")) {
        return { location: "center", targetId };
      }
      return intent;
    },
    [splitDock],
  );

  // Position the preview imperatively (transform only) so following the pointer
  // never triggers a React re-render.
  const positionOverlay = useCallback((point: Point): void => {
    const element = overlayRef.current;
    if (element) {
      element.style.transform = `translate(${point.x + PREVIEW_OFFSET.x}px, ${point.y + PREVIEW_OFFSET.y}px)`;
    }
  }, []);

  const attachOverlay = useCallback((element: HTMLDivElement | null): void => {
    overlayRef.current = element;
  }, []);

  useEffect(() => {
    const handleStart = (event: DragStartEvent): void => {
      const source = event.operation.source;
      if (!source) {
        return;
      }
      const subject = subjectFor(source);
      if (!subject) {
        return;
      }
      const point = event.operation.position.current;
      setPreview({
        label: labelOf(source),
        x: point.x + PREVIEW_OFFSET.x,
        y: point.y + PREVIEW_OFFSET.y,
      });
      actorRef.send({ subject, type: "START" });
    };

    // dnd-kit's dragmove gives the live pointer on every move, which drives the
    // preview position and the indicator's intent.
    const handleMove = (event: DragMoveEvent): void => {
      const op = event.operation;
      const point = op.position.current;
      positionOverlay(point);
      const draggedId = op.source ? String(op.source.id) : undefined;
      const hit = tabsetAt(point);
      actorRef.send({
        intent: hit ? resolveIntent(hit.id, hit.element, point, draggedId) : null,
        type: "OVER",
      });
    };

    // Recompute the dock zone from the final pointer, then set the intent and
    // commit in one synchronous pair.
    const handleEnd = (event: DragEndEvent): void => {
      setPreview(null);
      if (event.canceled) {
        actorRef.send({ type: "CANCEL" });
        return;
      }
      const op = event.operation;
      const point = op.position.current;
      const draggedId = op.source ? String(op.source.id) : undefined;
      const hit = tabsetAt(point);
      if (hit) {
        actorRef.send({
          intent: resolveIntent(hit.id, hit.element, point, draggedId),
          type: "OVER",
        });
      }
      actorRef.send({ type: "DROP" });
    };
    const offStart = manager.monitor.addEventListener("dragstart", handleStart);
    const offMove = manager.monitor.addEventListener("dragmove", handleMove);
    const offEnd = manager.monitor.addEventListener("dragend", handleEnd);
    return () => {
      offStart();
      offMove();
      offEnd();
    };
  }, [actorRef, manager, positionOverlay, resolveIntent, tabsetAt]);

  const contextValue = useMemo<DragContextValue>(
    () => ({ manager, registerTabset }),
    [manager, registerTabset],
  );

  return (
    <DragContext.Provider value={contextValue}>
      <DragSubjectContext.Provider value={dragSubject}>
        {children}
        <DockIndicator actorRef={actorRef} getTabsetElement={getTabsetElement} />
        <DragPreview overlayRef={attachOverlay} preview={preview} />
      </DragSubjectContext.Provider>
    </DragContext.Provider>
  );
};

// The draggable/droppable hooks and the drag contexts live in ./drag-hooks to
// keep this module under the size cap and avoid a circular import; re-exported
// here so consumers still import the whole drag surface from "./drag-adapter".
export { DragProvider, useDragSubject, useTabDraggable, useTabsetDraggable, useTabsetDroppable };

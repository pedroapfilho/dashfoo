"use client";

import type { Action, DockLocation, DragSubject, DropIntent, Point } from "@dashfoo/core";
import { dragDockMachine, resolveDockTarget, zoneRect } from "@dashfoo/core";
import { Accessibility, DragDropManager, Draggable, Feedback, KeyboardSensor } from "@dnd-kit/dom";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/dom";
import { useActorRef, useSelector } from "@xstate/react";
import type { CSSProperties, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ActorRefFrom } from "xstate";

import type { Zone } from "./tab-insertion";
import { insertionIndex, insertionLineRect, pointInRect, shouldAllowDrop } from "./tab-insertion";

// This module is the drag adapter: the only place that touches @dnd-kit. It wires
// the framework-agnostic @dnd-kit/dom core (no React bindings) to the already
// unit-tested dragDockMachine — the PointerSensor supplies activation + a live
// pointer, the adapter hit-tests that pointer against the registered tabsets, and
// the machine owns the lifecycle and emits a moveNode COMMIT forwarded via
// onCommit. The drag preview is our own overlay, so there is no Feedback plugin,
// no placeholder clone, and none of the CSS workarounds those required.

type DragActor = ActorRefFrom<typeof dragDockMachine>;

type DragContextValue = {
  manager: DragDropManager;
  registerTabset: (id: string, element: HTMLElement | null) => void;
};

const DragContext = createContext<DragContextValue | null>(null);

const DragSubjectContext = createContext<DragSubject | null>(null);

// The dragged tab is excluded so its own slot never counts toward the order —
// the insertion index and line are measured against the tabs it will land among.
const tabRects = (strip: Element, excludeId?: string): Array<DOMRect> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].flatMap((tab) =>
    tab.dataset.tabId === excludeId ? [] : [tab.getBoundingClientRect()],
  );

// Whole-tab-item rects (label + close button), excluding the dragged tab. The
// insertion line lands on these boundaries so the "after the last tab" position
// sits past the close button, not between the label and the close.
const tabItemRects = (strip: Element, excludeId?: string): Array<DOMRect> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab-item"]')].flatMap((item) =>
    item.querySelector<HTMLElement>('[data-dashfoo="tab"]')?.dataset.tabId === excludeId
      ? []
      : [item.getBoundingClientRect()],
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

const overlayBase: CSSProperties = {
  boxSizing: "border-box",
  pointerEvents: "none",
  position: "fixed",
  // Overridable so a theme can drop it under prefers-reduced-motion.
  transition: "var(--dashfoo-dock-transition, left 60ms, top 60ms, width 60ms, height 60ms)",
  zIndex: 9999,
};

// Only position/size are fixed inline; every visual property is an overridable
// CSS var with a neutral fallback, so a consumer's data-dashfoo="dock-indicator"
// theme fully owns the look.
const paneStyle = (zone: Zone): CSSProperties => ({
  ...overlayBase,
  background: "var(--dashfoo-dock-fill, rgba(125, 125, 135, 0.18))",
  border:
    "var(--dashfoo-dock-border-width, 1px) solid var(--dashfoo-dock-border, rgba(160, 160, 170, 0.75))",
  borderRadius: "var(--dashfoo-dock-radius, 6px)",
  height: zone.height,
  left: zone.x,
  top: zone.y,
  width: zone.width,
});

const lineStyle = (zone: Zone): CSSProperties => ({
  ...overlayBase,
  background: "var(--dashfoo-dock-line, rgb(140, 140, 150))",
  borderRadius: "var(--dashfoo-dock-line-radius, 2px)",
  height: zone.height,
  left: zone.x,
  top: zone.y,
  width: zone.width,
});

// A "where it will land" indicator driven off the machine's live intent: an
// insertion line in the tab bar for a stack, the matching content half for a split.
const DockIndicator = ({
  actorRef,
  getTabsetElement,
}: {
  actorRef: DragActor;
  getTabsetElement: (id: string) => HTMLElement | undefined;
}): ReactNode => {
  const intent = useSelector(actorRef, (snapshot) => snapshot.context.intent);
  const draggedId = useSelector(actorRef, (snapshot) => snapshot.context.subject?.id);
  if (!intent) {
    return null;
  }
  const element = getTabsetElement(intent.targetId);
  if (!element) {
    return null;
  }
  if (intent.location === "center") {
    const strip = element.querySelector('[data-dashfoo="tabstrip"]');
    if (strip) {
      const line = insertionLineRect(
        strip.getBoundingClientRect(),
        tabItemRects(strip, draggedId),
        intent.index ?? 0,
      );
      return <div data-dashfoo="dock-indicator" style={lineStyle(line)} />;
    }
  }
  const zone = zoneRect(element.getBoundingClientRect(), intent.location);
  return <div data-dashfoo="dock-indicator" style={paneStyle(zone)} />;
};

// The pointer-anchored chip that follows the cursor while dragging.
const PREVIEW_OFFSET: Point = { x: 12, y: 8 };

const previewStyle: CSSProperties = { left: 0, position: "fixed", top: 0, zIndex: 9999 };

type DragPreviewState = { label: string; x: number; y: number };

const DragPreview = ({
  overlayRef,
  preview,
}: {
  overlayRef: (element: HTMLDivElement | null) => void;
  preview: DragPreviewState | null;
}): ReactNode => {
  if (!preview) {
    return null;
  }
  return (
    <div
      data-dashfoo="drag-preview"
      ref={overlayRef}
      style={{ ...previewStyle, transform: `translate(${preview.x}px, ${preview.y}px)` }}
    >
      {preview.label}
    </div>
  );
};

const labelOf = (source: { data?: Record<string, unknown> } | null): string => {
  const raw = source?.data?.label;
  return typeof raw === "string" ? raw : "";
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

  // One manager for the whole layout. Plugins drop the screen-reader announcer
  // and the visual Feedback plugin (we render our own preview). Sensors drop the
  // KeyboardSensor: its nudge model double-binds the arrow keys the tab strip
  // already uses for roving-tabindex navigation, so keyboard docking needs its
  // own interaction design rather than this sensor. Pointer drag only.
  // useState lazily constructs it once; the destroy rides a useInsertionEffect
  // cleanup (not useEffect) so StrictMode's simulated unmount doesn't tear down
  // the live instance — the same pattern @dnd-kit/react uses internally.
  const [manager] = useState(
    () =>
      new DragDropManager({
        plugins: (defaults) =>
          defaults.filter((plugin) => plugin !== Accessibility && plugin !== Feedback),
        sensors: (defaults) => defaults.filter((sensor) => sensor !== KeyboardSensor),
      }),
  );
  useInsertionEffect(() => () => manager.destroy(), [manager]);

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
      // A tabset grip carries { tabsetId, type: "tabset" }; a tab carries its id.
      const isTabset = source.data?.type === "tabset";
      const point = event.operation.position.current;
      setPreview({
        label: labelOf(source),
        x: point.x + PREVIEW_OFFSET.x,
        y: point.y + PREVIEW_OFFSET.y,
      });
      actorRef.send({
        subject: {
          id: isTabset ? String(source.data.tabsetId) : String(source.id),
          kind: isTabset ? "tabset" : "tab",
        },
        type: "START",
      });
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

  const contextValue = useMemo(() => ({ manager, registerTabset }), [manager, registerTabset]);

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

// Tracks a Draggable's element across renders without rebuilding it. Returned by
// the draggable hooks; their effects own the Draggable's lifecycle.
type DraggableHandle = {
  draggableRef: { current: Draggable | null };
  elementRef: { current: Element | null };
  ref: (element: Element | null) => void;
};

const useDraggableHandle = (): DraggableHandle => {
  const elementRef = useRef<Element | null>(null);
  const draggableRef = useRef<Draggable | null>(null);
  const ref = useCallback((element: Element | null): void => {
    elementRef.current = element;
    if (draggableRef.current) {
      draggableRef.current.element = element ?? undefined;
    }
  }, []);
  return { draggableRef, elementRef, ref };
};

const useTabDraggable = (
  tabId: string,
  disabled = false,
  label = "",
): { ref: (element: Element | null) => void } => {
  const context = useContext(DragContext);
  const { draggableRef, elementRef, ref } = useDraggableHandle();
  useEffect(() => {
    const manager = context?.manager;
    if (!manager || disabled) {
      return undefined;
    }
    const draggable = new Draggable({ data: { label, type: "tab" }, id: tabId }, manager);
    draggable.element = elementRef.current ?? undefined;
    draggableRef.current = draggable;
    return () => {
      draggable.destroy();
      draggableRef.current = null;
    };
  }, [context, disabled, draggableRef, elementRef, label, tabId]);
  return { ref };
};

// The whole tabset is draggable from its grip. A distinct dnd-kit id (grip-*)
// avoids colliding with the tabset's own registered id; the real tabset id rides
// in `data` and becomes the moveTabset subject. The label feeds the overlay chip.
const useTabsetDraggable = (
  tabsetId: string,
  disabled = false,
  label = "",
): { ref: (element: Element | null) => void } => {
  const context = useContext(DragContext);
  const { draggableRef, elementRef, ref } = useDraggableHandle();
  useEffect(() => {
    const manager = context?.manager;
    if (!manager || disabled) {
      return undefined;
    }
    const draggable = new Draggable(
      { data: { label, tabsetId, type: "tabset" }, id: `grip-${tabsetId}` },
      manager,
    );
    draggable.element = elementRef.current ?? undefined;
    draggableRef.current = draggable;
    return () => {
      draggable.destroy();
      draggableRef.current = null;
    };
  }, [context, disabled, draggableRef, elementRef, label, tabsetId]);
  return { ref };
};

// Registers the tabset element so the adapter can hit-test the pointer against it.
const useTabsetDroppable = (tabsetId: string): { ref: (element: HTMLElement | null) => void } => {
  const context = useContext(DragContext);
  const ref = useCallback(
    (element: HTMLElement | null): void => {
      context?.registerTabset(tabsetId, element);
    },
    [context, tabsetId],
  );
  return { ref };
};

const useDragSubject = (): DragSubject | null => useContext(DragSubjectContext);

export { DragProvider, useDragSubject, useTabDraggable, useTabsetDraggable, useTabsetDroppable };

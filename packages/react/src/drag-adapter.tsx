"use client";

import type { Action, DropIntent, Point } from "@dashfoo/core";
import { dragDockMachine } from "@dashfoo/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/react";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import { useActorRef, useSelector } from "@xstate/react";
import type { CSSProperties, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import type { ActorRefFrom } from "xstate";

import { borderZoneRect, computeDropIntent, frameEdgeIntent, zoneRect } from "./dock-geometry";

// This module is the drag adapter: the only place that imports @dnd-kit/react.
// It feeds the (already unit-tested) dragDockMachine — dnd-kit supplies the
// source/target ids and the pointer; the machine owns the lifecycle and emits a
// moveNode COMMIT, which the provider forwards to the document via onCommit.

type DragActor = ActorRefFrom<typeof dragDockMachine>;

type DragContextValue = {
  registerTabset: (id: string, element: HTMLElement | null) => void;
};

const DragContext = createContext<DragContextValue | null>(null);

type Zone = { height: number; width: number; x: number; y: number };

const pointInRect = (point: Point, rect: DOMRect): boolean =>
  point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;

// The dragged tab is excluded so its own slot never counts toward the order —
// the insertion index and line are measured against the tabs it will land among.
const tabRects = (strip: Element, excludeId?: string): Array<DOMRect> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')]
    .filter((tab) => tab.dataset.tabId !== excludeId)
    .map((tab) => tab.getBoundingClientRect());

// Which slot in the tab strip the pointer is over: the first tab whose midpoint
// is right of the pointer, else the end.
const insertionIndex = (strip: Element, pointerX: number, excludeId?: string): number => {
  const rects = tabRects(strip, excludeId);
  const found = rects.findIndex((rect) => pointerX < rect.left + rect.width / 2);
  return found === -1 ? rects.length : found;
};

// The tab strip is always a "stack as a tab" target, with an insertion index that
// places the tab at a specific slot. Only the content area below it resolves to
// the center/split zones via resolveDockTarget (content center appends).
const intentForTabset = (
  id: string,
  element: HTMLElement,
  point: Point,
  draggedId?: string,
): DropIntent => {
  const strip = element.querySelector('[data-dashfoo="tabstrip"]');
  if (strip && pointInRect(point, strip.getBoundingClientRect())) {
    return { index: insertionIndex(strip, point.x, draggedId), location: "center", targetId: id };
  }
  const intent = computeDropIntent(id, element.getBoundingClientRect(), point);
  return intent.location === "center" && strip
    ? { ...intent, index: tabRects(strip, draggedId).length }
    : intent;
};

// The thin vertical line marking where the tab will be inserted in the strip.
const insertionLineRect = (
  element: HTMLElement,
  index: number,
  excludeId?: string,
): Zone | undefined => {
  const strip = element.querySelector('[data-dashfoo="tabstrip"]');
  if (!strip) {
    return undefined;
  }
  const stripRect = strip.getBoundingClientRect();
  const rects = tabRects(strip, excludeId);
  const at: DOMRect | undefined = rects[index];
  const last = rects.at(-1);
  const x = at?.left ?? last?.right ?? stripRect.left;
  return { height: stripRect.height, width: 2, x: x - 1, y: stripRect.top };
};

const overlayBase: CSSProperties = {
  boxSizing: "border-box",
  pointerEvents: "none",
  position: "fixed",
  transition: "left 60ms, top 60ms, width 60ms, height 60ms",
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
  getFrameElement,
  getTabsetElement,
}: {
  actorRef: DragActor;
  getFrameElement: () => HTMLElement | null;
  getTabsetElement: (id: string) => HTMLElement | undefined;
}): ReactNode => {
  const intent = useSelector(actorRef, (snapshot) => snapshot.context.intent);
  const draggedId = useSelector(actorRef, (snapshot) => snapshot.context.subject?.id);
  if (!intent) {
    return null;
  }
  if (intent.location.startsWith("border-")) {
    const frame = getFrameElement();
    if (!frame) {
      return null;
    }
    const band = borderZoneRect(frame.getBoundingClientRect(), intent.location);
    return <div data-dashfoo="dock-indicator" style={paneStyle(band)} />;
  }
  const element = getTabsetElement(intent.targetId);
  if (!element) {
    return null;
  }
  if (intent.location === "center") {
    const line = insertionLineRect(element, intent.index ?? 0, draggedId);
    if (line) {
      return <div data-dashfoo="dock-indicator" style={lineStyle(line)} />;
    }
  }
  const zone = zoneRect(element.getBoundingClientRect(), intent.location);
  return <div data-dashfoo="dock-indicator" style={paneStyle(zone)} />;
};

type DragProviderProps = {
  borderDock?: boolean;
  children: ReactNode;
  onCommit: (action: Action) => void;
  splitDock?: boolean;
};

const DragProvider = ({
  borderDock = true,
  children,
  onCommit,
  splitDock = true,
}: DragProviderProps): ReactNode => {
  const actorRef = useActorRef(dragDockMachine);
  const tabsets = useRef(new Map<string, HTMLElement>());
  const frame = useRef<HTMLElement | null>(null);

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
  const getFrameElement = useCallback(() => frame.current, []);

  // The dock intent for a pointer over a tabset: the outer frame sliver docks to
  // a border (it wins over the tabset's own zones), otherwise the tabset resolves
  // center/split. Caches the frame element so the indicator can paint the band.
  const resolveIntent = useCallback(
    (targetId: string, element: HTMLElement, point: Point, draggedId?: string): DropIntent => {
      const layout = element.closest<HTMLElement>('[data-dashfoo="layout"]');
      frame.current = layout;
      const border =
        borderDock && layout ? frameEdgeIntent(layout.getBoundingClientRect(), point) : null;
      if (border) {
        return border;
      }
      const intent = intentForTabset(targetId, element, point, draggedId);
      // When splitting is disabled, a drop over the body stacks instead of splits.
      if (!splitDock && intent.location.startsWith("split-")) {
        return { location: "center", targetId };
      }
      return intent;
    },
    [borderDock, splitDock],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent): void => {
      const source = event.operation.source;
      if (source) {
        actorRef.send({ subject: { id: String(source.id), kind: "tab" }, type: "START" });
      }
    },
    [actorRef],
  );

  // Live dock zone: dnd-kit's onDragMove gives the current target + pointer on
  // every move, which drives the indicator's intent.
  const handleDragMove = useCallback(
    (event: DragMoveEvent): void => {
      const op = event.operation;
      const target = op.target;
      const draggedId = op.source ? String(op.source.id) : undefined;
      const element = target ? tabsets.current.get(String(target.id)) : undefined;
      if (target && element) {
        const intent = resolveIntent(String(target.id), element, op.position.current, draggedId);
        actorRef.send({ intent, type: "OVER" });
      } else {
        actorRef.send({ intent: null, type: "OVER" });
      }
    },
    [actorRef, resolveIntent],
  );

  // Recompute the dock zone from dnd-kit's authoritative final target + pointer,
  // then set the intent and commit in one synchronous pair.
  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      if (event.canceled) {
        actorRef.send({ type: "CANCEL" });
        return;
      }
      const op = event.operation;
      const target = op.target;
      const draggedId = op.source ? String(op.source.id) : undefined;
      const element = target ? tabsets.current.get(String(target.id)) : undefined;
      if (target && element) {
        const intent = resolveIntent(String(target.id), element, op.position.current, draggedId);
        actorRef.send({ intent, type: "OVER" });
      }
      actorRef.send({ type: "DROP" });
    },
    [actorRef, resolveIntent],
  );

  const contextValue = useMemo(() => ({ registerTabset }), [registerTabset]);

  return (
    <DragContext.Provider value={contextValue}>
      <DragDropProvider
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        onDragStart={handleDragStart}
      >
        {children}
        <DockIndicator
          actorRef={actorRef}
          getFrameElement={getFrameElement}
          getTabsetElement={getTabsetElement}
        />
      </DragDropProvider>
    </DragContext.Provider>
  );
};

const useTabDraggable = (
  tabId: string,
  disabled = false,
): { isDragging: boolean; ref: (element: Element | null) => void } => {
  const { isDragging, ref } = useDraggable({ data: { type: "tab" }, disabled, id: tabId });
  return { isDragging, ref };
};

const useTabsetDroppable = (
  tabsetId: string,
): { isDropTarget: boolean; ref: (element: HTMLElement | null) => void } => {
  const context = useContext(DragContext);
  const { isDropTarget, ref: dndRef } = useDroppable({ data: { type: "tabset" }, id: tabsetId });

  const ref = useCallback(
    (element: HTMLElement | null): void => {
      dndRef(element);
      context?.registerTabset(tabsetId, element);
    },
    [context, dndRef, tabsetId],
  );

  return { isDropTarget, ref };
};

export { DragProvider, useTabDraggable, useTabsetDroppable };

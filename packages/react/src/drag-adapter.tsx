"use client";

import type { Action } from "@dashfoo/core";
import { dragDockMachine } from "@dashfoo/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/react";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import { useActorRef, useSelector } from "@xstate/react";
import type { CSSProperties, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import type { ActorRefFrom } from "xstate";

import { computeDropIntent, zoneRect } from "./dock-geometry";

// This module is the drag adapter: the only place that imports @dnd-kit/react.
// It feeds the (already unit-tested) dragDockMachine — dnd-kit supplies the
// source/target ids and the pointer; the machine owns the lifecycle and emits a
// moveNode COMMIT, which the provider forwards to the document via onCommit.

type DragActor = ActorRefFrom<typeof dragDockMachine>;

type DragContextValue = {
  registerTabset: (id: string, element: HTMLElement | null) => void;
};

const DragContext = createContext<DragContextValue | null>(null);

const indicatorStyle = (zone: {
  height: number;
  width: number;
  x: number;
  y: number;
}): CSSProperties => ({
  background: "var(--dashfoo-dock-fill, rgba(91, 157, 255, 0.18))",
  border: "1px solid var(--dashfoo-dock-border, rgba(91, 157, 255, 0.7))",
  borderRadius: 6,
  boxSizing: "border-box",
  height: zone.height,
  left: zone.x,
  pointerEvents: "none",
  position: "fixed",
  top: zone.y,
  transition: "left 60ms, top 60ms, width 60ms, height 60ms",
  width: zone.width,
  zIndex: 9999,
});

// A "where it will land" overlay driven off the machine's live intent: the whole
// tabset for a center stack, the matching half for a split.
const DockIndicator = ({
  actorRef,
  getTabsetElement,
}: {
  actorRef: DragActor;
  getTabsetElement: (id: string) => HTMLElement | undefined;
}): ReactNode => {
  const intent = useSelector(actorRef, (snapshot) => snapshot.context.intent);
  if (!intent) {
    return null;
  }
  const element = getTabsetElement(intent.targetId);
  if (!element) {
    return null;
  }
  const zone = zoneRect(element.getBoundingClientRect(), intent.location);
  return <div data-dashfoo="dock-indicator" style={indicatorStyle(zone)} />;
};

type DragProviderProps = { children: ReactNode; onCommit: (action: Action) => void };

const DragProvider = ({ children, onCommit }: DragProviderProps): ReactNode => {
  const actorRef = useActorRef(dragDockMachine);
  const tabsets = useRef(new Map<string, HTMLElement>());

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
      const element = target ? tabsets.current.get(String(target.id)) : undefined;
      if (target && element) {
        const intent = computeDropIntent(
          String(target.id),
          element.getBoundingClientRect(),
          op.position.current,
        );
        actorRef.send({ intent, type: "OVER" });
      } else {
        actorRef.send({ intent: null, type: "OVER" });
      }
    },
    [actorRef],
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
      const element = target ? tabsets.current.get(String(target.id)) : undefined;
      if (target && element) {
        const intent = computeDropIntent(
          String(target.id),
          element.getBoundingClientRect(),
          op.position.current,
        );
        actorRef.send({ intent, type: "OVER" });
      }
      actorRef.send({ type: "DROP" });
    },
    [actorRef],
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
        <DockIndicator actorRef={actorRef} getTabsetElement={getTabsetElement} />
      </DragDropProvider>
    </DragContext.Provider>
  );
};

const useTabDraggable = (
  tabId: string,
): { isDragging: boolean; ref: (element: Element | null) => void } => {
  const { isDragging, ref } = useDraggable({ data: { type: "tab" }, id: tabId });
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

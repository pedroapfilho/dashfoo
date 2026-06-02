"use client";

import type { Action } from "@dashfoo/core";
import { dragDockMachine } from "@dashfoo/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/react";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import { useActorRef } from "@xstate/react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";

import { computeDropIntent } from "./dock-geometry";

// This module is the drag adapter: the only place that imports @dnd-kit/react.
// It feeds the (already unit-tested) dragDockMachine — dnd-kit supplies the
// source/target ids and the pointer; the machine owns the lifecycle and emits a
// moveNode COMMIT, which the provider forwards to the document via onCommit.

type DragContextValue = {
  registerTabset: (id: string, element: HTMLElement | null) => void;
};

const DragContext = createContext<DragContextValue | null>(null);

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

  const handleDragStart = useCallback(
    (event: DragStartEvent): void => {
      const source = event.operation.source;
      if (source) {
        actorRef.send({ subject: { id: String(source.id), kind: "tab" }, type: "START" });
      }
    },
    [actorRef],
  );

  // Compute the dock zone at drop time from the final target + pointer, then set
  // the intent and commit in one synchronous pair. dnd-kit's onDragMove proved
  // unreliable across sensors; the operation.target + pointerup position at the
  // end are authoritative.
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
        // dnd-kit's own tracked pointer — consistent with the target it resolved.
        const point = op.position.current;
        const intent = computeDropIntent(String(target.id), element.getBoundingClientRect(), point);
        actorRef.send({ intent, type: "OVER" });
      }
      actorRef.send({ type: "DROP" });
    },
    [actorRef],
  );

  const contextValue = useMemo(() => ({ registerTabset }), [registerTabset]);

  return (
    <DragContext.Provider value={contextValue}>
      <DragDropProvider onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        {children}
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

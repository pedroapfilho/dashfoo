"use client";

import type { DragSubject } from "@dashfoo/core";
import { Draggable } from "@dnd-kit/dom";
import type { DragDropManager } from "@dnd-kit/dom";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";

// Shared drag contexts + the draggable/droppable hooks. Lives apart from
// drag-adapter.tsx so the contexts can be owned here without a circular import:
// drag-adapter imports these for DragProvider and re-exports the hooks, and this
// module never reaches back into drag-adapter.

type DragContextValue = {
  manager: DragDropManager;
  registerTabset: (id: string, element: HTMLElement | null) => void;
};

const DragContext = createContext<DragContextValue | null>(null);

const DragSubjectContext = createContext<DragSubject | null>(null);

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

// What a draggable carries: the dnd-kit id and the stable data (drag kind +
// tabset id), both derived from identity. The chip label is passed separately so
// it never sits in the construction effect's deps. data must be referentially
// stable (the wrappers memoize it) so the construction effect tracks it without
// rebuilding on every render.
type DraggableDescriptor = { data: Record<string, unknown>; id: string };

// Owns the full Draggable lifecycle shared by the tab and tabset hooks. The
// construction effect is keyed on identity only (manager, id, disabled, the
// stable data) — never on the chip label — so a tab click or rename can't tear
// down and rebuild the live instance. The label is folded into the live data by
// a separate effect, since data is only read at drag start; both effects fire in
// the same mount commit, so the label is current well before any pointer drag.
// `Draggable.data` is a public accessor in @dnd-kit/abstract, so the in-place
// update is type-safe.
const useDraggableEntity = (
  descriptor: DraggableDescriptor,
  disabled: boolean,
  label: string,
): { ref: (element: Element | null) => void } => {
  const context = useContext(DragContext);
  const { draggableRef, elementRef, ref } = useDraggableHandle();
  const { data, id } = descriptor;

  useEffect(() => {
    const manager = context?.manager;
    if (!manager || disabled) {
      return undefined;
    }
    const draggable = new Draggable({ data: { ...data, label: "" }, id }, manager);
    draggable.element = elementRef.current ?? undefined;
    draggableRef.current = draggable;
    return () => {
      draggable.destroy();
      draggableRef.current = null;
    };
  }, [context, data, disabled, draggableRef, elementRef, id]);

  useEffect(() => {
    const draggable = draggableRef.current;
    if (draggable) {
      draggable.data = { ...data, label };
    }
  }, [data, draggableRef, label]);

  return { ref };
};

const useTabDraggable = (
  tabId: string,
  disabled = false,
  label = "",
): { ref: (element: Element | null) => void } => {
  const data = useMemo(() => ({ type: "tab" }), []);
  return useDraggableEntity({ data, id: tabId }, disabled, label);
};

// The whole tabset is draggable from its grip. A distinct dnd-kit id (grip-*)
// avoids colliding with the tabset's own registered id; the real tabset id rides
// in `data` and becomes the moveTabset subject. The label feeds the overlay chip.
const useTabsetDraggable = (
  tabsetId: string,
  disabled = false,
  label = "",
): { ref: (element: Element | null) => void } => {
  const data = useMemo(() => ({ tabsetId, type: "tabset" }), [tabsetId]);
  return useDraggableEntity({ data, id: `grip-${tabsetId}` }, disabled, label);
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

export type { DragContextValue };
export {
  DragContext,
  DragSubjectContext,
  useDragSubject,
  useTabDraggable,
  useTabsetDraggable,
  useTabsetDroppable,
};

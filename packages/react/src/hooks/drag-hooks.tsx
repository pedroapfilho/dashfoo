"use client";

import type {
  Action,
  dragDockMachine,
  DragSubject,
  DropIntent,
  Point,
  TabNode,
} from "@dashfoo/core";
import {
  Accessibility,
  Draggable,
  DragDropManager,
  Droppable,
  Feedback,
  PointerSensor,
} from "@dnd-kit/dom";
import { useSelector } from "@xstate/react";
import type { Context } from "react";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef } from "react";
import type { ActorRefFrom } from "xstate";

import type { DashfooDragData } from "../lib/drag-subject";
import { topmostPointerIntersection } from "../lib/topmost-collision";

const INTERACTIVE_SELECTOR = `
  input:not([disabled]),
  select:not([disabled]),
  textarea:not([disabled]),
  button:not([disabled]),
  a[href],
  [contenteditable]:not([contenteditable="false"])
`;

const preventActivation = (event: PointerEvent, source: Draggable): boolean => {
  const { target } = event;
  if (!(target instanceof Element)) {
    return false;
  }
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  return interactive !== null && interactive !== source.element;
};

type DashfooDragManager = DragDropManager;
type DashfooDraggable = Draggable;

const createDragManager = (): DashfooDragManager =>
  new DragDropManager({
    plugins: (defaults) => [
      ...defaults.filter((plugin) => plugin !== Accessibility && plugin !== Feedback),
      Feedback.configure({ dropAnimation: null }),
    ],
    sensors: () => [PointerSensor.configure({ preventActivation })],
  });

type DragActor = ActorRefFrom<typeof dragDockMachine>;

/**
 * One per rendered layer (the main tree, then one per float); the manager and
 * actor are shared above them. `layerId` namespaces droppable registrations, so
 * two layers can hold a tabset with the same model id.
 */
type DragScope = {
  commit: (action: Action) => void;
  layerId: string;
  resolveIntent: (
    targetId: string,
    element: HTMLElement,
    point: Point,
    draggedId?: string,
  ) => DropIntent | null;
};

type DragRootContextValue = {
  actorRef: DragActor;
  manager: DashfooDragManager;
  registerScope: (scope: DragScope) => () => void;
};

const DragRootContext: Context<DragRootContextValue | null> =
  createContext<DragRootContextValue | null>(null);

type DragContextValue = {
  actorRef: DragActor;
  layerId: string;
  manager: DashfooDragManager;
};

const DragContext = createContext<DragContextValue | null>(null);

const SharedDragManagerContext: Context<DashfooDragManager | null> =
  createContext<DashfooDragManager | null>(null);

/** The intent is rebuilt every pointer move, so readers compare by value. */
const sameDropIntent = (a: DropIntent | null, b: DropIntent | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.index === b.index &&
    a.location === b.location &&
    a.targetId === b.targetId);

type DraggableHandle = {
  draggableRef: { current: DashfooDraggable | null };
  elementRef: { current: Element | null };
  ref: (element: Element | null) => void;
};

const useDraggableHandle = (): DraggableHandle => {
  const elementRef = useRef<Element | null>(null);
  const draggableRef = useRef<DashfooDraggable | null>(null);
  const ref = useCallback((element: Element | null): void => {
    elementRef.current = element;
    if (draggableRef.current) {
      draggableRef.current.element = element ?? undefined;
    }
  }, []);
  return { draggableRef, elementRef, ref };
};

type DraggableDescriptor = { data: DashfooDragData; id: string };

const useDraggableEntity = (
  descriptor: DraggableDescriptor,
  disabled: boolean,
  label: string,
): { ref: (element: Element | null) => void } => {
  const context = useContext(DragContext);

  const sharedManager = useContext(SharedDragManagerContext);
  const manager = context?.manager ?? sharedManager;
  const { draggableRef, elementRef, ref } = useDraggableHandle();
  const { data, id } = descriptor;

  useEffect(() => {
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
  }, [data, disabled, draggableRef, elementRef, id, manager]);

  useEffect(() => {
    const draggable = draggableRef.current;
    if (draggable) {
      draggable.data = { ...data, label };
    }
  }, [data, draggableRef, label]);

  return useMemo(() => ({ ref }), [ref]);
};

const useTabDraggable = (
  tabId: string,
  disabled = false,
  label = "",
): { ref: (element: Element | null) => void } => {
  const data = useMemo(() => ({ type: "tab" }) satisfies DashfooDragData, []);
  return useDraggableEntity({ data, id: tabId }, disabled, label);
};

const useTabsetDraggable = (
  tabsetId: string,
  disabled = false,
  label = "",
): { ref: (element: Element | null) => void } => {
  const data = useMemo(() => ({ tabsetId, type: "tabset" }) satisfies DashfooDragData, [tabsetId]);
  return useDraggableEntity({ data, id: `grip-${tabsetId}` }, disabled, label);
};

const useTabsetDroppable = (tabsetId: string): { ref: (element: HTMLElement | null) => void } => {
  const context = useContext(DragContext);
  const elementRef = useRef<HTMLElement | null>(null);
  const droppableRef = useRef<Droppable | null>(null);
  const ref = useCallback((element: HTMLElement | null): void => {
    elementRef.current = element;
    if (droppableRef.current) {
      droppableRef.current.element = element ?? undefined;
    }
  }, []);
  const layerId = context?.layerId;
  const manager = context?.manager;

  useEffect(() => {
    if (!manager || layerId === undefined) {
      return undefined;
    }

    const droppable = new Droppable(
      {
        collisionDetector: topmostPointerIntersection,
        data: { layerId, tabsetId, type: "tabset" },
        id: `${layerId}:${tabsetId}`,
      },
      manager,
    );
    droppable.element = elementRef.current ?? undefined;
    droppableRef.current = droppable;
    return () => {
      droppable.destroy();
      droppableRef.current = null;
    };
  }, [layerId, manager, tabsetId]);

  return useMemo(() => ({ ref }), [ref]);
};

type ExternalTabSourceOptions = {
  createTab: () => TabNode;
  disabled?: boolean;
  label?: string;
};

const useExternalTabSource = ({
  createTab,
  disabled = false,
  label = "",
}: ExternalTabSourceOptions): { ref: (element: Element | null) => void } => {
  const id = useId();
  const createTabRef = useRef(createTab);

  useEffect(() => {
    createTabRef.current = createTab;
  }, [createTab]);
  const data = useMemo(
    () =>
      ({
        createTab: (): TabNode => createTabRef.current(),
        type: "external",
      }) satisfies DashfooDragData,
    [],
  );
  return useDraggableEntity({ data, id: `external-${id}` }, disabled, label);
};

/**
 * Reads the root's actor, so it works from an overlay mounted beside the layout
 * rather than inside a drag layer. Outside a provider it reports the empty state
 * instead of throwing.
 */
const useDragSubject = (): DragSubject | null => {
  const actorRef = useContext(DragRootContext)?.actorRef;
  return useSelector(actorRef, (snapshot) => {
    const drag = snapshot?.context.drag;
    return drag?.kind === "dragging" ? drag.subject : null;
  });
};

const useDropIntent = (): DropIntent | null => {
  const actorRef = useContext(DragRootContext)?.actorRef;
  return useSelector(
    actorRef,
    (snapshot) => {
      const drag = snapshot?.context.drag;
      return drag?.kind === "dragging" ? (drag.drop?.intent ?? null) : null;
    },
    sameDropIntent,
  );
};

export type {
  DragActor,
  DragContextValue,
  DashfooDragManager,
  DragRootContextValue,
  DragScope,
  ExternalTabSourceOptions,
};
export {
  createDragManager,
  DragContext,
  DragRootContext,
  sameDropIntent,
  SharedDragManagerContext,
  useDragSubject,
  useDropIntent,
  useExternalTabSource,
  useTabDraggable,
  useTabsetDraggable,
  useTabsetDroppable,
};

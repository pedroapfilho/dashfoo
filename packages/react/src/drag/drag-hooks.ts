"use client";

import type { DragSubject, DropIntent, TabNode } from "@dashfoo/core";
import { warnOnce } from "@dashfoo/core";
import { Draggable, Droppable } from "@dnd-kit/dom";
import { useSelector } from "@xstate/react";
import { useCallback, useContext, useEffect, useId, useMemo, useRef } from "react";

import { DragContext } from "./drag-context";
import type { DashfooDragManager } from "./drag-manager";
import type { DashfooDragData } from "./drag-subject";
import { topmostPointerIntersection } from "./topmost-collision";

const tabsetDroppableId = (layerId: string, tabsetId: string): string => `${layerId}:${tabsetId}`;

/** The intent is rebuilt every pointer move, so readers compare by value. */
const sameDropIntent = (a: DropIntent | null, b: DropIntent | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.index === b.index &&
    a.location === b.location &&
    a.targetId === b.targetId);

/** Tabs and grips drag only inside a `Layout.DragLayer`: without one there is nowhere to drop. */
const useLayerManager = (): DashfooDragManager | undefined => {
  const context = useContext(DragContext);
  return context?.layerId === null ? undefined : context?.manager;
};

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

type DraggableDescriptor = { data: DashfooDragData; id: string };

const useDraggableEntity = (
  manager: DashfooDragManager | undefined,
  descriptor: DraggableDescriptor,
  disabled: boolean,
  label: string,
): { ref: (element: Element | null) => void } => {
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
  const manager = useLayerManager();
  const data = useMemo(() => ({ type: "tab" }) satisfies DashfooDragData, []);
  return useDraggableEntity(manager, { data, id: tabId }, disabled, label);
};

const useTabsetDraggable = (
  tabsetId: string,
  disabled = false,
  label = "",
): { ref: (element: Element | null) => void } => {
  const manager = useLayerManager();
  const data = useMemo(() => ({ tabsetId, type: "tabset" }) satisfies DashfooDragData, [tabsetId]);
  return useDraggableEntity(manager, { data, id: `grip-${tabsetId}` }, disabled, label);
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
  const layerId = context?.layerId ?? null;
  const manager = context?.manager;

  useEffect(() => {
    if (!manager || layerId === null) {
      return undefined;
    }

    const droppable = new Droppable(
      {
        collisionDetector: topmostPointerIntersection,
        data: { layerId, tabsetId, type: "tabset" },
        id: tabsetDroppableId(layerId, tabsetId),
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
  const manager = useContext(DragContext)?.manager;
  const id = useId();
  const createTabRef = useRef(createTab);

  useEffect(() => {
    createTabRef.current = createTab;
  }, [createTab]);

  const hasRoot = manager !== undefined;
  useEffect(() => {
    if (!hasRoot && !disabled) {
      warnOnce(
        "external-source-no-root",
        "useExternalTabSource has no drag root above it; render the source and the layout inside one <DashfooDragProvider>",
      );
    }
  }, [disabled, hasRoot]);

  const data = useMemo(
    () =>
      ({
        createTab: (): TabNode => createTabRef.current(),
        type: "external",
      }) satisfies DashfooDragData,
    [],
  );
  return useDraggableEntity(manager, { data, id: `external-${id}` }, disabled, label);
};

/**
 * Reads the root's actor, so it works from an overlay mounted beside the layout
 * rather than inside a drag layer. Outside a root it reports the empty state
 * instead of throwing.
 */
const useDragSubject = (): DragSubject | null => {
  const actorRef = useContext(DragContext)?.actorRef;
  return useSelector(actorRef, (snapshot) => {
    const drag = snapshot?.context.drag;
    return drag?.kind === "dragging" ? drag.subject : null;
  });
};

const useDropIntent = (): DropIntent | null => {
  const actorRef = useContext(DragContext)?.actorRef;
  return useSelector(
    actorRef,
    (snapshot) => {
      const drag = snapshot?.context.drag;
      return drag?.kind === "dragging" ? (drag.drop?.intent ?? null) : null;
    },
    sameDropIntent,
  );
};

export type { ExternalTabSourceOptions };
export {
  sameDropIntent,
  tabsetDroppableId,
  useDragSubject,
  useDropIntent,
  useExternalTabSource,
  useTabDraggable,
  useTabsetDraggable,
  useTabsetDroppable,
};

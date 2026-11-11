"use client";

import type { DragSubject, DropIndicator, DropIntent, TabNode } from "@dashfoo/core";
import { warnOnce } from "@dashfoo/core";
import { Draggable, Droppable } from "@dnd-kit/dom";
import { useSelector } from "@xstate/react";
import { useCallback, useContext, useEffect, useId, useMemo, useRef } from "react";

import { useLayout } from "../layout/layout-store";
import { mergeRefs } from "../lib/merge-refs";

import { DragContext } from "./drag-context";
import type { DashfooDragManager } from "./drag-manager";
import type { DashfooDragData } from "./drag-subject";
import { useNativeSource, useNativeTarget } from "./native-drag";
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

type DndEntity = { destroy: () => void; element?: Element };

type DndEntityBinding<E extends DndEntity> = {
  entityRef: { current: E | null };
  ref: (element: Element | null) => void;
};

/**
 * Binds a dnd-kit entity to whatever element the returned ref receives. The
 * entity lives as long as `create` keeps its identity; `null` means none.
 */
const useDndEntity = <E extends DndEntity>(create: (() => E) | null): DndEntityBinding<E> => {
  const elementRef = useRef<Element | null>(null);
  const entityRef = useRef<E | null>(null);

  const ref = useCallback((element: Element | null): void => {
    elementRef.current = element;

    if (entityRef.current) {
      entityRef.current.element = element ?? undefined;
    }
  }, []);

  useEffect(() => {
    if (!create) {
      return undefined;
    }

    const entity = create();
    entity.element = elementRef.current ?? undefined;
    entityRef.current = entity;

    return () => {
      entity.destroy();
      entityRef.current = null;
    };
  }, [create]);

  return { entityRef, ref };
};

type DraggableDescriptor = { data: DashfooDragData; id: string };

const useDraggableEntity = (
  manager: DashfooDragManager | undefined,
  descriptor: DraggableDescriptor,
  disabled: boolean,
  label: string,
): { ref: (element: Element | null) => void } => {
  const { data, id } = descriptor;

  const create = useMemo(
    () =>
      manager && !disabled
        ? () => new Draggable({ data: { ...data, label: "" }, id }, manager)
        : null,
    [data, disabled, id, manager],
  );

  const { entityRef, ref } = useDndEntity(create);

  useEffect(() => {
    const draggable = entityRef.current;

    if (draggable) {
      draggable.data = { ...data, label };
    }
  }, [create, data, entityRef, label]);

  return useMemo(() => ({ ref }), [ref]);
};

const useNodeDraggable = (
  kind: "tab" | "tabset",
  id: string,
  disabled: boolean,
  label: string,
): { ref: (element: Element | null) => void } => {
  const manager = useLayerManager();
  const documentId = useLayout((state) => state.documentId);

  const data = useMemo(
    () => ({ documentId, id, type: kind }) satisfies DashfooDragData,
    [documentId, id, kind],
  );

  const { ref } = useDraggableEntity(
    manager,
    { data, id: JSON.stringify([documentId, kind, id]) },
    disabled,
    label,
  );

  const nativeRef = useNativeSource(kind, id, disabled);

  return useMemo(() => ({ ref: mergeRefs(ref, nativeRef) }), [nativeRef, ref]);
};

const useTabsetDroppable = (tabsetId: string): { ref: (element: Element | null) => void } => {
  const context = useContext(DragContext);
  const layerId = context?.layerId ?? null;
  const manager = context?.manager;

  const create = useMemo(
    () =>
      manager && layerId !== null
        ? () =>
            new Droppable(
              {
                collisionDetector: topmostPointerIntersection,
                data: { layerId, tabsetId },
                id: tabsetDroppableId(layerId, tabsetId),
              },
              manager,
            )
        : null,
    [layerId, manager, tabsetId],
  );

  const { ref } = useDndEntity(create);
  const nativeRef = useNativeTarget(tabsetId);

  return useMemo(() => ({ ref: mergeRefs(ref, nativeRef) }), [nativeRef, ref]);
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

/** The id of the node of `kind` this layout's document is dragging, or `null`. */
const useDraggedNodeId = (kind: "tab" | "tabset"): string | null => {
  const actorRef = useContext(DragContext)?.actorRef;
  const documentId = useLayout((state) => state.documentId);

  return useSelector(actorRef, (snapshot) => {
    const drag = snapshot?.context.drag;

    return drag?.kind === "dragging" &&
      drag.subject.kind === kind &&
      drag.subject.documentId === documentId
      ? drag.subject.id
      : null;
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

/** The insertion line or split zone the built-in indicator draws, in viewport pixels. */
const useDropIndicator = (): DropIndicator | null => {
  const actorRef = useContext(DragContext)?.actorRef;

  return useSelector(actorRef, (snapshot) => {
    const drag = snapshot?.context.drag;

    return drag?.kind === "dragging" ? (drag.drop?.indicator ?? null) : null;
  });
};

export type { ExternalTabSourceOptions };

export {
  sameDropIntent,
  useDraggedNodeId,
  useDragSubject,
  useDropIndicator,
  useDropIntent,
  useExternalTabSource,
  useNodeDraggable,
  useTabsetDroppable,
};

"use client";

import { dragDockMachine } from "@dashfoo/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/dom";
import { useActorRef } from "@xstate/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useInsertionEffect, useMemo, useState } from "react";

import type { DragRootContextValue, DragScope } from "../hooks/drag-hooks";
import { createDragManager, DragRootContext, SharedDragManagerContext } from "../hooks/drag-hooks";
import { subjectFor } from "../lib/drag-subject";

import { DragPreviewOverlay } from "./drag-preview-overlay";

type ScopedTarget = { element: HTMLElement; scope: DragScope; tabsetId: string };

const DashfooDragProvider = ({ children }: { children: ReactNode }): ReactNode => {
  const [manager] = useState(createDragManager);
  useInsertionEffect(
    () => () => {
      manager.destroy();
    },
    [manager],
  );

  const actorRef = useActorRef(dragDockMachine);

  const [scopes] = useState(() => new Map<string, DragScope>());
  const registerScope = useCallback(
    (scope: DragScope): (() => void) => {
      scopes.set(scope.layerId, scope);
      return () => {
        scopes.delete(scope.layerId);
      };
    },
    [scopes],
  );

  /**
   * One listener set and one actor for the whole tree. Attached per layer, a
   * single pointer move fanned out to every float's actor, and each one that did
   * not own the target resolved `intent: null` and then swallowed the drop.
   */
  useEffect(() => {
    const scopedTarget = (): ScopedTarget | null => {
      const target = manager.dragOperation.target;
      const data = target?.data as { layerId?: string; tabsetId?: string } | undefined;
      const scope = data?.layerId === undefined ? undefined : scopes.get(data.layerId);
      const element = target?.element;
      if (!scope || data?.tabsetId === undefined || !(element instanceof HTMLElement)) {
        return null;
      }
      return { element, scope, tabsetId: data.tabsetId };
    };

    let intentLayerId: string | null = null;

    const syncIntent = (): void => {
      const operation = manager.dragOperation;
      const found = scopedTarget();
      const draggedId = operation.source ? String(operation.source.id) : undefined;
      const intent =
        found === null
          ? null
          : found.scope.resolveIntent(
              found.tabsetId,
              found.element,
              operation.position.current,
              draggedId,
            );
      intentLayerId = intent === null || found === null ? null : found.scope.layerId;
      actorRef.send({ intent, type: "OVER" });
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
      intentLayerId = null;
      actorRef.send({ subject, type: "START" });
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

    const commitSubscription = actorRef.on("COMMIT", (emitted) => {
      const scope = intentLayerId === null ? undefined : scopes.get(intentLayerId);
      scope?.commit(emitted.action);
    });
    const offStart = manager.monitor.addEventListener("dragstart", handleStart);
    const offMove = manager.monitor.addEventListener("dragmove", handleMove);
    const offCollision = manager.monitor.addEventListener("collision", handleCollision);
    const offEnd = manager.monitor.addEventListener("dragend", handleEnd);
    return () => {
      commitSubscription.unsubscribe();
      offStart();
      offMove();
      offCollision();
      offEnd();
    };
  }, [actorRef, manager, scopes]);

  const rootValue = useMemo<DragRootContextValue>(
    () => ({ actorRef, manager, registerScope }),
    [actorRef, manager, registerScope],
  );

  return (
    <SharedDragManagerContext.Provider value={manager}>
      <DragRootContext.Provider value={rootValue}>
        {children}
        <DragPreviewOverlay manager={manager} />
      </DragRootContext.Provider>
    </SharedDragManagerContext.Provider>
  );
};

export { DashfooDragProvider };

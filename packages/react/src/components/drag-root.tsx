"use client";

import { dragDockMachine } from "@dashfoo/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/dom";
import { useActorRef } from "@xstate/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useInsertionEffect, useMemo, useState } from "react";

import type { DragRootContextValue, DragScope } from "../hooks/drag-hooks";
import { createDragManager, DragRootContext, SharedDragManagerContext } from "../hooks/drag-hooks";
import { subjectFor } from "../lib/drag-subject";

import { DragPreviewOverlay } from "./drag-overlays";

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

  // One listener set and one actor for the whole tree: per layer, a float that
  // did not own the target resolved a null intent and swallowed the drop.
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
      actorRef.send({
        drop: intent === null || found === null ? null : { intent, scope: found.scope.layerId },
        type: "OVER",
      });
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
      actorRef.send({ subject, type: "START" });
    };

    // `dragmove` and `collision` both fire per frame and each resolve measures
    // the target strip. The drop path stays synchronous: a deferred resolve
    // would land after the actor had already been asked to commit.
    let frame: number | null = null;
    const scheduleResolve = (): void => {
      if (frame !== null) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = null;
        syncIntent();
      });
    };
    const cancelPendingResolve = (): void => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const handleEnd = (event: DragEndEvent): void => {
      cancelPendingResolve();
      if (event.canceled) {
        actorRef.send({ type: "CANCEL" });
        return;
      }
      syncIntent();
      actorRef.send({ type: "DROP" });
    };

    const commitSubscription = actorRef.on("COMMIT", (emitted) => {
      scopes.get(emitted.scope)?.commit(emitted.action);
    });
    const offStart = manager.monitor.addEventListener("dragstart", handleStart);
    const offMove = manager.monitor.addEventListener("dragmove", scheduleResolve);
    const offCollision = manager.monitor.addEventListener("collision", scheduleResolve);
    const offEnd = manager.monitor.addEventListener("dragend", handleEnd);
    return () => {
      cancelPendingResolve();
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

"use client";

import { dragDockMachine } from "@dashfoo/core";
import type { Data } from "@dnd-kit/abstract";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/dom";
import { useActorRef } from "@xstate/react";
import type { ReactNode } from "react";
import { useCallback, useContext, useEffect, useInsertionEffect, useMemo, useState } from "react";

import type { DragActor, DragContextValue, RegisteredLayer } from "./drag-context";
import { DragContext } from "./drag-context";
import type { DashfooDragManager } from "./drag-manager";
import { createDragManager } from "./drag-manager";
import { DragPreviewOverlay } from "./drag-preview";
import { subjectFor } from "./drag-subject";

type LayerTarget = { element: HTMLElement; layer: RegisteredLayer; tabsetId: string };
type LayerTargetData = Data & { layerId: string; tabsetId: string };

const isLayerTargetData = (data: Data): data is LayerTargetData =>
  typeof data.layerId === "string" && typeof data.tabsetId === "string";

// One listener set and one actor for the whole tree: per layer, a float that
// did not own the target resolved a null intent and swallowed the drop.
const useDragMonitor = (
  manager: DashfooDragManager,
  actorRef: DragActor,
  layers: Map<string, RegisteredLayer>,
): void => {
  useEffect(() => {
    const layerTarget = (): LayerTarget | null => {
      const target = manager.dragOperation.target;
      const data = target?.data;
      const element = target?.element;
      if (!data || !isLayerTargetData(data) || !(element instanceof HTMLElement)) {
        return null;
      }
      const layer = layers.get(data.layerId);
      return layer ? { element, layer, tabsetId: data.tabsetId } : null;
    };

    const syncIntent = (): void => {
      const drag = actorRef.getSnapshot().context.drag;
      if (drag.kind !== "dragging") {
        return;
      }
      const found = layerTarget();
      const intent =
        found === null
          ? null
          : found.layer.resolveIntent(
              drag.subject,
              found.tabsetId,
              found.element,
              manager.dragOperation.position.current,
            );
      actorRef.send({
        drop: intent === null || found === null ? null : { intent, scope: found.layer.layerId },
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
      layers.get(emitted.scope)?.commit(emitted.action);
    });
    manager.monitor.addEventListener("dragstart", handleStart);
    manager.monitor.addEventListener("dragmove", scheduleResolve);
    manager.monitor.addEventListener("collision", scheduleResolve);
    manager.monitor.addEventListener("dragend", handleEnd);
    return () => {
      cancelPendingResolve();
      commitSubscription.unsubscribe();
      manager.monitor.removeEventListener("dragstart", handleStart);
      manager.monitor.removeEventListener("dragmove", scheduleResolve);
      manager.monitor.removeEventListener("collision", scheduleResolve);
      manager.monitor.removeEventListener("dragend", handleEnd);
    };
  }, [actorRef, layers, manager]);
};

const OwnedDragRoot = ({ children }: { children: ReactNode }): ReactNode => {
  // StrictMode double-fires effect cleanups, and a destroyed manager stops
  // emitting drag events without an error; insertion-effect cleanups run once.
  const [manager] = useState(createDragManager);
  useInsertionEffect(
    () => () => {
      manager.destroy();
    },
    [manager],
  );

  const actorRef = useActorRef(dragDockMachine);

  const [layers] = useState(() => new Map<string, RegisteredLayer>());
  const registerLayer = useCallback(
    (layer: RegisteredLayer): (() => void) => {
      layers.set(layer.layerId, layer);
      return () => {
        layers.delete(layer.layerId);
      };
    },
    [layers],
  );

  useDragMonitor(manager, actorRef, layers);

  const value = useMemo<DragContextValue>(
    () => ({ actorRef, layerId: null, manager, registerLayer }),
    [actorRef, manager, registerLayer],
  );

  return (
    <DragContext.Provider value={value}>
      {children}
      <DragPreviewOverlay manager={manager} />
    </DragContext.Provider>
  );
};

/** Clears the enclosing layer, so a layout nested in a tab registers its tabsets under its own layers. */
const SharedDragRoot = ({
  children,
  outer,
}: {
  children: ReactNode;
  outer: DragContextValue;
}): ReactNode => {
  const value = useMemo<DragContextValue>(() => ({ ...outer, layerId: null }), [outer]);
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
};

/**
 * One manager, drag actor and preview for everything below it. `Layout.Root`
 * mounts one; an inner root reuses the outer, so a layout and its outside drag
 * sources share drags under one provider.
 */
const DashfooDragProvider = ({ children }: { children: ReactNode }): ReactNode => {
  const outer = useContext(DragContext);
  return outer === null ? (
    <OwnedDragRoot>{children}</OwnedDragRoot>
  ) : (
    <SharedDragRoot outer={outer}>{children}</SharedDragRoot>
  );
};

export { DashfooDragProvider };

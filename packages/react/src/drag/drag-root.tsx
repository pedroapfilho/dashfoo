"use client";

import type { Point } from "@dashfoo/core";
import { dragDockMachine } from "@dashfoo/core/internal";
import type { Data } from "@dnd-kit/abstract";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/dom";
import { useActorRef } from "@xstate/react";
import type { ReactNode } from "react";
import { useCallback, useContext, useEffect, useInsertionEffect, useMemo, useState } from "react";

import { isHTMLElement } from "../lib/dom";

import { DockIndicator } from "./dock-indicator";
import type { DragContextValue, RegisteredLayer } from "./drag-context";
import { DragContext } from "./drag-context";
import type { DashfooDragManager } from "./drag-manager";
import { createDragManager } from "./drag-manager";
import { DragPreviewOverlay } from "./drag-preview";
import type { DragSession } from "./drag-session";
import { createDragSession } from "./drag-session";
import { subjectFor } from "./drag-subject";
import { pointerRelease, viewOf } from "./tear-off";

type LayerTargetData = Data & { layerId: string; tabsetId: string };

const isLayerTargetData = (data: Data): data is LayerTargetData =>
  typeof data.layerId === "string" && typeof data.tabsetId === "string";

/** The tear-off a pointer release at `point` would perform, or `null`. */
const pendingTearOff = (
  session: DragSession,
  source: Element | null | undefined,
  point: Point,
): (() => void) | null => {
  const subject = session.subject();
  const view = viewOf(source);

  return subject && view
    ? session.tearOff(subject, source ?? null, pointerRelease(point, view))
    : null;
};

/** dnd-kit as a source of the session's events: one listener set for the whole tree. */
const usePointerDrags = (manager: DashfooDragManager, session: DragSession): void => {
  useEffect(() => {
    const resolve = (): void => {
      const target = manager.dragOperation.target;
      const data = target?.data;
      const element = target?.element;

      session.over(
        data && isLayerTargetData(data) && isHTMLElement(element)
          ? {
              element,
              layerId: data.layerId,
              point: manager.dragOperation.position.current,
              tabsetId: data.tabsetId,
            }
          : null,
      );
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

      session.start(subject, "own");
    };

    // `dragmove` and `collision` both fire per frame and each resolve measures
    // the target strip. The drop path stays synchronous: a deferred resolve
    // would land after the session had already been asked to drop.
    let frame: number | null = null;

    const scheduleResolve = (): void => {
      if (frame !== null) {
        return;
      }

      frame = requestAnimationFrame(() => {
        frame = null;
        resolve();
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
        session.cancel();

        return;
      }

      resolve();

      const tearOff = pendingTearOff(
        session,
        event.operation.source?.element,
        event.operation.position.current,
      );

      if (!session.drop()) {
        tearOff?.();
      }
    };

    const stopListening = session.listen();

    manager.monitor.addEventListener("dragstart", handleStart);
    manager.monitor.addEventListener("dragmove", scheduleResolve);
    manager.monitor.addEventListener("collision", scheduleResolve);
    manager.monitor.addEventListener("dragend", handleEnd);

    return () => {
      cancelPendingResolve();
      stopListening();
      manager.monitor.removeEventListener("dragstart", handleStart);
      manager.monitor.removeEventListener("dragmove", scheduleResolve);
      manager.monitor.removeEventListener("collision", scheduleResolve);
      manager.monitor.removeEventListener("dragend", handleEnd);
    };
  }, [manager, session]);
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
  const [session] = useState(() => createDragSession(actorRef, layers));

  const registerLayer = useCallback(
    (layer: RegisteredLayer): (() => void) => {
      layers.set(layer.layerId, layer);

      return () => {
        layers.delete(layer.layerId);
      };
    },
    [layers],
  );

  usePointerDrags(manager, session);

  const isFloating = useCallback(
    (scope: string): boolean => layers.get(scope)?.floating === true,
    [layers],
  );

  const isTearOff = useCallback(
    (point: Point): boolean =>
      pendingTearOff(session, manager.dragOperation.source?.element, point) !== null,
    [manager, session],
  );

  const value = useMemo<DragContextValue>(
    () => ({ actorRef, layerId: null, manager, registerLayer, session }),
    [actorRef, manager, registerLayer, session],
  );

  return (
    <DragContext.Provider value={value}>
      {children}
      <DockIndicator actorRef={actorRef} isFloating={isFloating} />
      <DragPreviewOverlay isTearOff={isTearOff} manager={manager} />
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

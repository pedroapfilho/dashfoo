import type { DragSubject, Point } from "@dashfoo/core";
import { dropAction } from "@dashfoo/core/internal";

import type { DragActor, RegisteredLayer } from "./drag-context";
import { sameDropResolution } from "./drag-hooks";
import type { Release } from "./tear-off";

type DropTarget = { element: HTMLElement; layerId: string; point: Point; tabsetId: string };

/**
 * One drag from start to end, whatever reports it: dnd-kit for pointer drags,
 * the browser's drag and drop for drags that cross windows.
 */
type DragSession = {
  cancel: () => void;
  /** `false` when nothing could drop where the drag was. */
  drop: () => boolean;
  /** Commits every drop to the layer that resolved it; returns the unsubscribe. */
  listen: () => () => void;
  /** `false` when nothing can drop on `target`. */
  over: (target: DropTarget | null) => boolean;
  /** A drag already under way with `subject` carries on, so every `dragover` of a native drag can call this. */
  start: (subject: DragSubject, origin?: "adopted" | "own") => void;
  /** A source under this root started the drag, rather than one that entered from another root or window. */
  startedHere: () => boolean;
  subject: () => DragSubject | null;
  /** The tear-off `release` would perform, or `null`: inside the window, or the subject's layout takes none. */
  tearOff: (subject: DragSubject, source: Element | null, release: Release) => (() => void) | null;
};

const documentOf = (subject: DragSubject): string | null =>
  subject.kind === "external" ? null : subject.documentId;

const sameSubject = (a: DragSubject, b: DragSubject): boolean =>
  a.kind === b.kind && a.id === b.id && documentOf(a) === documentOf(b);

const createDragSession = (
  actorRef: DragActor,
  layers: ReadonlyMap<string, RegisteredLayer>,
): DragSession => {
  let own = false;

  const dragging = () => {
    const { drag } = actorRef.getSnapshot().context;

    return drag.kind === "dragging" ? drag : null;
  };

  const cancel = (): void => {
    own = false;

    if (dragging()) {
      actorRef.send({ type: "CANCEL" });
    }
  };

  return {
    cancel,
    drop: () => {
      const drag = dragging();
      const dropped = drag !== null && dropAction(drag) !== null;
      own = false;
      actorRef.send({ type: "DROP" });

      return dropped;
    },
    listen: () => {
      const subscription = actorRef.on("COMMIT", (emitted) => {
        layers.get(emitted.scope)?.commit(emitted.action, emitted.subject);
      });

      return () => {
        subscription.unsubscribe();
      };
    },
    over: (target) => {
      const drag = dragging();

      if (!drag) {
        return false;
      }

      const layer = target ? layers.get(target.layerId) : undefined;

      const resolved =
        target && layer
          ? layer.resolveDrop(drag.subject, target.tabsetId, target.element, target.point)
          : null;

      const drop = resolved && layer ? { ...resolved, scope: layer.layerId } : null;

      // Every pointer move resolves a fresh object; an unchanged drop must not
      // wake every subscriber, so only a different one reaches the actor.
      if (!sameDropResolution(drag.drop, drop)) {
        actorRef.send({ drop, type: "OVER" });
      }

      return drop !== null;
    },
    start: (subject, origin = "adopted") => {
      const drag = dragging();

      if (drag && sameSubject(drag.subject, subject)) {
        return;
      }

      cancel();
      own = origin === "own";
      actorRef.send({ subject, type: "START" });
    },
    startedHere: () => own,
    subject: () => dragging()?.subject ?? null,
    tearOff: (subject, source, release) => {
      if (subject.kind === "external" || !release.outside) {
        return null;
      }

      const { documentId } = subject;
      const layer = [...layers.values()].find((candidate) => candidate.documentId() === documentId);
      const tearOff = layer?.tearOff();

      return tearOff
        ? () => {
            tearOff(subject, source, release.screen);
          }
        : null;
    },
  };
};

export { createDragSession };

export type { DragSession };

import { assign, emit, setup } from "xstate";

import type { TabNode } from "../model/schema";
import type { Action, DropIntent } from "../state/actions";

type DragSubject =
  | { id: string; kind: "tab" | "tabset" }
  | { id: string; kind: "external"; tab: TabNode };

/** `scope` names whoever resolved the intent, echoed back on `COMMIT` so the host can route the action. */
type DropResolution = { intent: DropIntent; scope: string };

/** One value, so a drop target without a subject is unrepresentable. See ADR 0002. */
type DragState =
  | { drop: DropResolution | null; kind: "dragging"; subject: DragSubject }
  | { kind: "idle" };

type DragContext = { drag: DragState };

type DragEvent =
  | { drop: DropResolution | null; type: "OVER" }
  | { subject: DragSubject; type: "START" }
  | { type: "CANCEL" }
  | { type: "DROP" };

type DragEmitted = { action: Action; scope: string; type: "COMMIT" };

/** One definition of both "is this drop valid" and "what does it do", so the guard and the emit agree. */
const dropAction = (drag: DragState): { action: Action; scope: string } | null => {
  if (drag.kind !== "dragging" || drag.drop === null) {
    return null;
  }
  const { intent, scope } = drag.drop;
  const { subject } = drag;

  if (subject.kind === "external") {
    return {
      action: {
        index: intent.index,
        location: intent.location,
        tab: subject.tab,
        targetId: intent.targetId,
        type: "addNode",
      },
      scope,
    };
  }
  if (subject.kind === "tabset") {
    return {
      action: {
        location: intent.location,
        sourceId: subject.id,
        targetId: intent.targetId,
        type: "moveTabset",
      },
      scope,
    };
  }
  return {
    action: {
      index: intent.index,
      location: intent.location,
      sourceId: subject.id,
      targetId: intent.targetId,
      type: "moveNode",
    },
    scope,
  };
};

const dragDockMachine = setup({
  guards: {
    hasValidDrop: ({ context }) => dropAction(context.drag) !== null,
  },
  types: {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: XState reads this only as phantom compile-time metadata.
    context: {} as DragContext,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: XState reads this only as phantom compile-time metadata.
    emitted: {} as DragEmitted,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: XState reads this only as phantom compile-time metadata.
    events: {} as DragEvent,
  },
}).createMachine({
  context: { drag: { kind: "idle" } },
  id: "dragDock",
  initial: "idle",
  states: {
    dragging: {
      on: {
        CANCEL: { target: "idle" },
        DROP: [
          {
            actions: emit(({ context }) => {
              const resolved = dropAction(context.drag);
              if (resolved === null) {
                throw new Error("drop requires a subject and a resolved drop target");
              }
              return { action: resolved.action, scope: resolved.scope, type: "COMMIT" };
            }),
            guard: "hasValidDrop",
            target: "idle",
          },
          { target: "idle" },
        ],
        OVER: {
          actions: assign({
            drag: ({ context, event }) =>
              context.drag.kind === "dragging"
                ? { ...context.drag, drop: event.drop }
                : context.drag,
          }),
        },
      },
    },
    idle: {
      entry: assign({ drag: { kind: "idle" } }),
      on: {
        START: {
          actions: assign({
            drag: ({ event }) => ({ drop: null, kind: "dragging", subject: event.subject }),
          }),
          target: "dragging",
        },
      },
    },
  },
});

export { dragDockMachine, dropAction };
export type { DragState, DragSubject, DropResolution };

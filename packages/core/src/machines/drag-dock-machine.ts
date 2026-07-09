import { assign, emit, setup } from "xstate";

import type { TabNode } from "../model/schema";
import type { Action, DropIntent } from "../state/actions";

type DragSubject =
  | { id: string; kind: "tab" | "tabset" }
  | { id: string; kind: "external"; tab: TabNode };

type DragContext = { intent: DropIntent | null; subject: DragSubject | null };

type DragEvent =
  | { intent: DropIntent | null; type: "OVER" }
  | { subject: DragSubject; type: "START" }
  | { type: "CANCEL" }
  | { type: "DROP" };

type DragEmitted = { action: Action; type: "COMMIT" };

const requireDrop = (context: DragContext): { intent: DropIntent; subject: DragSubject } => {
  if (context.subject === null || context.intent === null) {
    throw new Error("drop requires a subject and a drop intent");
  }
  return { intent: context.intent, subject: context.subject };
};

const dragDockMachine = setup({
  guards: {
    hasValidDrop: ({ context }) => context.subject !== null && context.intent !== null,
  },
  types: {
    context: {} as DragContext,
    emitted: {} as DragEmitted,
    events: {} as DragEvent,
  },
}).createMachine({
  context: { intent: null, subject: null },
  id: "dragDock",
  initial: "idle",
  states: {
    dragging: {
      on: {
        CANCEL: { target: "idle" },
        DROP: [
          {
            actions: emit(({ context }) => {
              const { intent, subject } = requireDrop(context);
              const action: Action =
                subject.kind === "external"
                  ? {
                      index: intent.index,
                      location: intent.location,
                      tab: subject.tab,
                      targetId: intent.targetId,
                      type: "addNode",
                    }
                  : {
                      index: intent.index,
                      location: intent.location,
                      sourceId: subject.id,
                      targetId: intent.targetId,
                      type: subject.kind === "tabset" ? "moveTabset" : "moveNode",
                    };
              return { action, type: "COMMIT" };
            }),
            guard: "hasValidDrop",
            target: "idle",
          },
          { target: "idle" },
        ],
        OVER: { actions: assign({ intent: ({ event }) => event.intent }) },
      },
    },
    idle: {
      entry: assign({ intent: null, subject: null }),
      on: {
        START: { actions: assign({ subject: ({ event }) => event.subject }), target: "dragging" },
      },
    },
  },
});

export { dragDockMachine };
export type { DragContext, DragEmitted, DragEvent, DragSubject };

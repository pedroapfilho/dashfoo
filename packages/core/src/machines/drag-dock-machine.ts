import { assign, emit, setup } from "xstate";

import type { Action, DockLocation } from "../actions";

type DragSubject = { id: string; kind: "tab" | "tabset" };
type DropIntent = { index?: number; location: DockLocation; targetId: string };

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

// The drag/dock interaction lifecycle, driven by abstract events the dnd-kit
// adapter maps from pointer/keyboard input. It owns transient drag state only and
// never touches the document — on a valid drop it emits a COMMIT carrying the
// moveNode action, which the React layer forwards to the document machine.
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
              return {
                action: {
                  index: intent.index,
                  location: intent.location,
                  sourceId: subject.id,
                  targetId: intent.targetId,
                  type: subject.kind === "tabset" ? "moveTabset" : "moveNode",
                },
                type: "COMMIT",
              };
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
export type { DragContext, DragEmitted, DragEvent, DragSubject, DropIntent };

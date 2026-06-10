import { assign, setup } from "xstate";

import type { Dashfoo } from "../model/schema";
import type { Action } from "../state/actions";
import type { History } from "../state/history";
import { createHistory, dispatch, redo, undo } from "../state/history";

type DashfooContext = { history: History };

type DashfooEvent =
  | { action: Action; type: "DISPATCH" }
  | { model: Dashfoo; type: "SET_MODEL" }
  | { type: "REDO" }
  | { type: "UNDO" };

type DashfooInput = { model: Dashfoo };

// The document actor: it owns the undo/redo history (whose `present` is the live
// model) and processes document mutations by invoking the pure reducer via the
// history helpers. It has no finite states beyond `ready` — the document is data,
// not a lifecycle — so every mutation is an event handled with assign.
const dashfooMachine = setup({
  types: {
    context: {} as DashfooContext,
    events: {} as DashfooEvent,
    input: {} as DashfooInput,
  },
}).createMachine({
  context: ({ input }) => ({ history: createHistory(input.model) }),
  id: "dashfoo",
  initial: "ready",
  states: {
    ready: {
      on: {
        DISPATCH: {
          actions: assign({
            history: ({ context, event }) => dispatch(context.history, event.action),
          }),
        },
        REDO: {
          actions: assign({ history: ({ context }) => redo(context.history) }),
        },
        SET_MODEL: {
          actions: assign({ history: ({ event }) => createHistory(event.model) }),
        },
        UNDO: {
          actions: assign({ history: ({ context }) => undo(context.history) }),
        },
      },
    },
  },
});

export { dashfooMachine };
export type { DashfooContext, DashfooEvent, DashfooInput };

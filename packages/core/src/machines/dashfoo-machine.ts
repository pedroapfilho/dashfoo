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

type DashfooMachineInput = { model: Dashfoo };

const dashfooMachine = setup({
  types: {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- XState's documented phantom-type API; the values are compile-time only.
    context: {} as DashfooContext,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- XState's documented phantom-type API; the values are compile-time only.
    events: {} as DashfooEvent,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- XState's documented phantom-type API; the values are compile-time only.
    input: {} as DashfooMachineInput,
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
export type { DashfooContext, DashfooEvent, DashfooMachineInput };

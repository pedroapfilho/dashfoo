import type { Action } from "./actions";
import { reducer } from "./reducer";
import type { Dashfoo } from "./schema";

// past/present/future snapshots plus the coalesce key of the last committed
// action, so a continuous resize drag collapses into a single undo step.
type History = {
  future: Array<Dashfoo>;
  lastKey: string | undefined;
  past: Array<Dashfoo>;
  present: Dashfoo;
};

// Resize actions are the only coalescable ones: a splitter drag emits many per
// frame, but should undo as one. Keyed by the node being resized so resizing a
// different splitter starts a new undo step.
const coalesceKey = (action: Action): string | undefined => {
  if (action.type === "adjustSplit") {
    return `adjustSplit:${action.rowId}`;
  }
  return undefined;
};

const createHistory = (present: Dashfoo): History => ({
  future: [],
  lastKey: undefined,
  past: [],
  present,
});

const canUndo = (history: History): boolean => history.past.length > 0;
const canRedo = (history: History): boolean => history.future.length > 0;

const dispatch = (history: History, action: Action): History => {
  const present = reducer(history.present, action);
  const key = coalesceKey(action);

  if (key !== undefined && key === history.lastKey && history.past.length > 0) {
    return { future: [], lastKey: key, past: history.past, present };
  }

  return { future: [], lastKey: key, past: [...history.past, history.present], present };
};

const undo = (history: History): History => {
  const previous = history.past.at(-1);
  if (previous === undefined) {
    return history;
  }
  return {
    future: [history.present, ...history.future],
    lastKey: undefined,
    past: history.past.slice(0, -1),
    present: previous,
  };
};

const redo = (history: History): History => {
  const [next, ...rest] = history.future;
  if (next === undefined) {
    return history;
  }
  return {
    future: rest,
    lastKey: undefined,
    past: [...history.past, history.present],
    present: next,
  };
};

export { canRedo, canUndo, createHistory, dispatch, redo, undo };
export type { History };

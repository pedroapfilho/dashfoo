import type { Dashfoo } from "../model/schema";

import type { Action } from "./actions";
import { reducer } from "./reducer";

type History = {
  future: Array<Dashfoo>;
  past: Array<Dashfoo>;
  present: Dashfoo;
};

const HISTORY_LIMIT = 100;

const createHistory = (present: Dashfoo): History => ({
  future: [],
  past: [],
  present,
});

const canUndo = (history: History): boolean => history.past.length > 0;
const canRedo = (history: History): boolean => history.future.length > 0;

const dispatch = (history: History, action: Action): History => {
  const present = reducer(history.present, action);
  return { future: [], past: [...history.past, history.present].slice(-HISTORY_LIMIT), present };
};

const undo = (history: History): History => {
  const previous = history.past.at(-1);
  if (previous === undefined) {
    return history;
  }
  return {
    future: [history.present, ...history.future],
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
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
  };
};

export { canRedo, canUndo, createHistory, dispatch, HISTORY_LIMIT, redo, undo };
export type { History };

import { normalize } from "../model/invariants";
import type { Dashfoo } from "../model/schema";

import type { Action } from "./actions";
import { reducer } from "./reducer";

type History = {
  future: Array<Dashfoo>;
  past: Array<Dashfoo>;
  present: Dashfoo;
};

const HISTORY_LIMIT = 100;

/** The entry point for outside documents, so every history holds a canonical model. */
const createHistory = (present: Dashfoo): History => ({
  future: [],
  past: [],
  present: normalize(present),
});

const canUndoHistory = (history: History): boolean => history.past.length > 0;
const canRedoHistory = (history: History): boolean => history.future.length > 0;

/**
 * An action that changed nothing is not an edit: recording it would spend an
 * undo slot and clear a redo stack the user just built. Not coalescing (ADR
 * 0002): two distinct edits are still two entries.
 */
const dispatchToHistory = (history: History, action: Action): History => {
  const present = reducer(history.present, action);

  if (Object.is(present, history.present)) {
    return history;
  }

  return { future: [], past: [...history.past, history.present].slice(-HISTORY_LIMIT), present };
};

const undoHistory = (history: History): History => {
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

const redoHistory = (history: History): History => {
  const next = history.future.at(0);

  if (next === undefined) {
    return history;
  }

  return {
    future: history.future.slice(1),
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
  };
};

export {
  canRedoHistory,
  canUndoHistory,
  createHistory,
  dispatchToHistory,
  HISTORY_LIMIT,
  redoHistory,
  undoHistory,
};

export type { History };

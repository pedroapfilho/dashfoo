"use client";

import type { Action, Dashfoo, History } from "@dashfoo/core";
import {
  canRedoHistory,
  canUndoHistory,
  createHistory,
  dispatchToHistory,
  normalize,
  redoHistory,
  reducer,
  undoHistory,
  warnOnce,
} from "@dashfoo/core";
import { useCallback, useMemo, useState } from "react";
import { createStore, useStore } from "zustand";

import type { PersistInput } from "./persistence";
import { useLayoutStorage } from "./persistence";

const CONTROLLED_HISTORY_MESSAGE =
  "undo/redo are unavailable while `model` is controlled; keep the history in the state you own and drive it through onModelChange";

const CONTROLLED_SET_MODEL_MESSAGE =
  "setModel (and reset/resetLayout) do nothing while `model` is controlled; set the model you own instead";

const CONTROLLED_MODE_SWITCH_MESSAGE =
  "`model` was added or removed after mount; a layout is controlled or uncontrolled for its whole life, so the first render wins. Remount (key=…) to switch";

const CONTROLLED_WITH_DEFAULT_MESSAGE =
  "`model` and `defaultModel` were both passed; `model` wins and `defaultModel` (and `persist`) are ignored";

const CONTROLLED_PERSIST_MESSAGE =
  "`persist` is ignored while `model` is controlled; save the model you own in onModelChange";

type DashfooStore = {
  canRedo: () => boolean;
  canUndo: () => boolean;
  dispatch: (action: Action) => void;
  model: Dashfoo;
  redo: () => void;
  reset: () => void;
  setModel: (model: Dashfoo) => void;
  undo: () => void;
};

type UseDashfooStoreOptions = {
  defaultModel?: Dashfoo;
  model?: Dashfoo;
  onAction?: (action: Action) => Action | null;
  onActiveTabsetChange?: (tabsetId: string | undefined) => void;
  onMaximizedTabsetChange?: (tabsetId: string | undefined) => void;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
  persist?: PersistInput;
};

/** The mode is latched on the first render; running both sources leaves the
 * unread one describing a document nobody rendered. */
const useDashfooStore = (options: UseDashfooStoreOptions): DashfooStore => {
  const {
    defaultModel,
    model: controlledModel,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange,
    persist,
  } = options;
  const initialModel = controlledModel ?? defaultModel;
  if (initialModel === undefined) {
    throw new Error("useDashfooStore requires either a `model` or a `defaultModel`.");
  }

  const [controlled] = useState(() => controlledModel !== undefined);
  if (controlled !== (controlledModel !== undefined)) {
    warnOnce("controlled-mode-switch", CONTROLLED_MODE_SWITCH_MESSAGE);
  }
  if (controlled && defaultModel !== undefined) {
    warnOnce("controlled-with-default", CONTROLLED_WITH_DEFAULT_MESSAGE);
  }
  if (controlled && persist !== undefined) {
    warnOnce("controlled-persist", CONTROLLED_PERSIST_MESSAGE);
  }

  const [historyStore] = useState(() => createStore<History>(() => createHistory(initialModel)));
  const history = useStore(historyStore);

  const model = useMemo(
    () => (controlledModel === undefined ? history.present : normalize(controlledModel)),
    [controlledModel, history.present],
  );

  /** Restoring a saved layout or resetting is not an edit, so it records no undo step and notifies nobody. */
  const replaceSilently = useCallback(
    (next: Dashfoo): void => {
      historyStore.setState(createHistory(next), true);
    },
    [historyStore],
  );

  const persistence = useLayoutStorage(controlled ? undefined : persist, replaceSilently);

  const notify = useCallback(
    (before: Dashfoo, after: Dashfoo, action?: Action) => {
      if (Object.is(before, after)) {
        return;
      }
      persistence.save(after);
      onModelChange?.(after, action);
      if (after.activeTabsetId !== before.activeTabsetId) {
        onActiveTabsetChange?.(after.activeTabsetId);
      }
      if (after.maximizedTabsetId !== before.maximizedTabsetId) {
        onMaximizedTabsetChange?.(after.maximizedTabsetId);
      }
    },
    [onModelChange, onActiveTabsetChange, onMaximizedTabsetChange, persistence],
  );

  const commit = useCallback(
    (step: (current: History) => History, action?: Action) => {
      const before = historyStore.getState();
      const after = step(before);
      historyStore.setState(after, true);
      notify(before.present, after.present, action);
    },
    [historyStore, notify],
  );

  const dispatch = useCallback(
    (action: Action) => {
      const resolved = onAction ? onAction(action) : action;
      if (!resolved) {
        return;
      }
      if (controlled) {
        notify(model, reducer(model, resolved), resolved);
        return;
      }
      commit((current) => dispatchToHistory(current, resolved), resolved);
    },
    [commit, controlled, model, notify, onAction],
  );

  const undo = useCallback(() => {
    if (controlled) {
      warnOnce("controlled-undo", CONTROLLED_HISTORY_MESSAGE);
      return;
    }
    commit(undoHistory);
  }, [commit, controlled]);

  const redo = useCallback(() => {
    if (controlled) {
      warnOnce("controlled-redo", CONTROLLED_HISTORY_MESSAGE);
      return;
    }
    commit(redoHistory);
  }, [commit, controlled]);

  const setModel = useCallback(
    (next: Dashfoo) => {
      if (controlled) {
        warnOnce("controlled-set-model", CONTROLLED_SET_MODEL_MESSAGE);
        return;
      }
      replaceSilently(next);
      persistence.save(historyStore.getState().present);
    },
    [controlled, historyStore, persistence, replaceSilently],
  );

  const reset = useCallback(() => {
    if (controlled) {
      warnOnce("controlled-set-model", CONTROLLED_SET_MODEL_MESSAGE);
      return;
    }
    persistence.clear();
    replaceSilently(initialModel);
  }, [controlled, initialModel, persistence, replaceSilently]);

  return useMemo(
    () => ({
      canRedo: () => !controlled && canRedoHistory(historyStore.getState()),
      canUndo: () => !controlled && canUndoHistory(historyStore.getState()),
      dispatch,
      model,
      redo,
      reset,
      setModel,
      undo,
    }),
    [controlled, dispatch, historyStore, model, redo, reset, setModel, undo],
  );
};

export { useDashfooStore };
export type { DashfooStore, UseDashfooStoreOptions };

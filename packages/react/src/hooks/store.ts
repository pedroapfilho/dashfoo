"use client";

import type { Action, Dashfoo } from "@dashfoo/core";
import { canRedo, canUndo, dashfooMachine, normalize } from "@dashfoo/core";
import { useActorRef, useSelector } from "@xstate/react";
import { useCallback, useEffect, useMemo } from "react";

import { warnOnce } from "../lib/warn-once";

const CONTROLLED_HISTORY_MESSAGE =
  "undo/redo are unavailable while `model` is controlled; keep the history in the state you own and drive it through onModelChange";

type DashfooStore = {
  canRedo: () => boolean;
  canUndo: () => boolean;
  dispatch: (action: Action) => void;
  model: Dashfoo;
  redo: () => void;
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
};

const useDashfooStore = (options: UseDashfooStoreOptions): DashfooStore => {
  const {
    defaultModel,
    model: controlledModel,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange,
  } = options;
  const initialModel = controlledModel ?? defaultModel;
  if (initialModel === undefined) {
    throw new Error("useDashfooStore requires either a `model` or a `defaultModel`.");
  }

  const actorRef = useActorRef(dashfooMachine, { input: { model: normalize(initialModel) } });
  const history = useSelector(actorRef, (snapshot) => snapshot.context.history);

  useEffect(() => {
    if (controlledModel !== undefined) {
      actorRef.send({ model: normalize(controlledModel), type: "SET_MODEL" });
    }
  }, [actorRef, controlledModel]);

  const model = controlledModel ?? history.present;

  const notify = useCallback(
    (before: Dashfoo, after: Dashfoo, action?: Action) => {
      if (Object.is(before, after)) {
        return;
      }
      onModelChange?.(after, action);
      if (after.activeTabsetId !== before.activeTabsetId) {
        onActiveTabsetChange?.(after.activeTabsetId);
      }
      if (after.maximizedTabsetId !== before.maximizedTabsetId) {
        onMaximizedTabsetChange?.(after.maximizedTabsetId);
      }
    },
    [onModelChange, onActiveTabsetChange, onMaximizedTabsetChange],
  );

  const dispatch = useCallback(
    (action: Action) => {
      const resolved = onAction ? onAction(action) : action;
      if (!resolved) {
        return;
      }

      const before = actorRef.getSnapshot().context.history.present;
      actorRef.send({ action: resolved, type: "DISPATCH" });
      notify(before, actorRef.getSnapshot().context.history.present, resolved);
    },
    [actorRef, notify, onAction],
  );

  const undo = useCallback(() => {
    if (controlledModel !== undefined) {
      warnOnce("controlled-undo", CONTROLLED_HISTORY_MESSAGE);
      return;
    }
    const before = actorRef.getSnapshot().context.history.present;
    actorRef.send({ type: "UNDO" });
    const after = actorRef.getSnapshot().context.history.present;
    notify(before, after);
  }, [actorRef, controlledModel, notify]);

  const redo = useCallback(() => {
    if (controlledModel !== undefined) {
      warnOnce("controlled-redo", CONTROLLED_HISTORY_MESSAGE);
      return;
    }
    const before = actorRef.getSnapshot().context.history.present;
    actorRef.send({ type: "REDO" });
    const after = actorRef.getSnapshot().context.history.present;
    notify(before, after);
  }, [actorRef, controlledModel, notify]);

  const setModel = useCallback(
    (next: Dashfoo) => {
      actorRef.send({ model: normalize(next), type: "SET_MODEL" });
    },
    [actorRef],
  );

  return useMemo(
    () => ({
      canRedo: () =>
        controlledModel === undefined && canRedo(actorRef.getSnapshot().context.history),
      canUndo: () =>
        controlledModel === undefined && canUndo(actorRef.getSnapshot().context.history),
      dispatch,
      model,
      redo,
      setModel,
      undo,
    }),
    [actorRef, controlledModel, dispatch, model, redo, setModel, undo],
  );
};

export { useDashfooStore };
export type { DashfooStore, UseDashfooStoreOptions };

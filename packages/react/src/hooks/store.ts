"use client";

import type { Action, Dashfoo } from "@dashfoo/core";
import { canRedo, canUndo, dashfooMachine, normalize, reducer } from "@dashfoo/core";
import { useActorRef, useSelector } from "@xstate/react";
import { useCallback, useEffect, useMemo } from "react";

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

      const transition = ((): { after: Dashfoo; before: Dashfoo } => {
        if (controlledModel === undefined) {
          const before = actorRef.getSnapshot().context.history.present;
          actorRef.send({ action: resolved, type: "DISPATCH" });
          return { after: actorRef.getSnapshot().context.history.present, before };
        }
        return { after: reducer(controlledModel, resolved), before: normalize(controlledModel) };
      })();
      notify(transition.before, transition.after, resolved);
    },
    [actorRef, controlledModel, notify, onAction],
  );

  const undo = useCallback(() => {
    if (controlledModel !== undefined) {
      return;
    }
    const before = actorRef.getSnapshot().context.history.present;
    actorRef.send({ type: "UNDO" });
    const after = actorRef.getSnapshot().context.history.present;
    notify(before, after);
  }, [actorRef, controlledModel, notify]);

  const redo = useCallback(() => {
    if (controlledModel !== undefined) {
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
      canRedo: () => canRedo(actorRef.getSnapshot().context.history),
      canUndo: () => canUndo(actorRef.getSnapshot().context.history),
      dispatch,
      model,
      redo,
      setModel,
      undo,
    }),
    [actorRef, dispatch, model, redo, setModel, undo],
  );
};

export { useDashfooStore };
export type { DashfooStore, UseDashfooStoreOptions };

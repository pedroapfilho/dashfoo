"use client";

import type { Action, Dashfoo } from "@dashfoo/core";
import { canRedo, canUndo, dashfooMachine, normalize, reducer } from "@dashfoo/core";
import { useActorRef, useSelector } from "@xstate/react";
import { useCallback, useEffect } from "react";

type DashfooStore = {
  canRedo: () => boolean;
  canUndo: () => boolean;
  dispatch: (action: Action) => void;
  model: Dashfoo;
  redo: () => void;
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

// Binds a dashfooMachine actor to React. Uncontrolled (defaultModel) lets the
// actor own the document with full undo/redo; controlled (model) makes the prop
// the source of truth and routes every change through onModelChange, keeping the
// actor synced so the inspector still sees it.
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

  // Normalize at the boundary so a host-supplied model satisfies the same
  // invariants (clamped selection, no empty tabsets, live maximizedTabsetId) the
  // reducer guarantees — every entry point holds a canonical model.
  const actorRef = useActorRef(dashfooMachine, { input: { model: normalize(initialModel) } });
  const history = useSelector(actorRef, (snapshot) => snapshot.context.history);

  useEffect(() => {
    if (controlledModel !== undefined) {
      actorRef.send({ model: normalize(controlledModel), type: "SET_MODEL" });
    }
  }, [actorRef, controlledModel]);

  const model = controlledModel ?? history.present;

  const dispatch = useCallback(
    (action: Action) => {
      // onAction may veto (null) or replace the action before it mutates anything.
      const resolved = onAction ? onAction(action) : action;
      if (!resolved) {
        return;
      }
      const before = controlledModel ?? actorRef.getSnapshot().context.history.present;
      let after: Dashfoo;
      if (controlledModel === undefined) {
        actorRef.send({ action: resolved, type: "DISPATCH" });
        after = actorRef.getSnapshot().context.history.present;
      } else {
        after = reducer(controlledModel, resolved);
      }
      onModelChange?.(after, resolved);
      if (after.activeTabsetId !== before.activeTabsetId) {
        onActiveTabsetChange?.(after.activeTabsetId);
      }
      if (after.maximizedTabsetId !== before.maximizedTabsetId) {
        onMaximizedTabsetChange?.(after.maximizedTabsetId);
      }
    },
    [
      actorRef,
      controlledModel,
      onAction,
      onActiveTabsetChange,
      onMaximizedTabsetChange,
      onModelChange,
    ],
  );

  const undo = useCallback(() => {
    actorRef.send({ type: "UNDO" });
    onModelChange?.(actorRef.getSnapshot().context.history.present);
  }, [actorRef, onModelChange]);

  const redo = useCallback(() => {
    actorRef.send({ type: "REDO" });
    onModelChange?.(actorRef.getSnapshot().context.history.present);
  }, [actorRef, onModelChange]);

  // Functions, not booleans: they read the live actor snapshot so a caller
  // reading them right after undo/redo (e.g. inside onModelChange) sees the fresh
  // value, not the one-render-stale useSelector result.
  return {
    canRedo: () => canRedo(actorRef.getSnapshot().context.history),
    canUndo: () => canUndo(actorRef.getSnapshot().context.history),
    dispatch,
    model,
    redo,
    undo,
  };
};

export { useDashfooStore };
export type { DashfooStore, UseDashfooStoreOptions };

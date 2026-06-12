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

// Binds a dashfooMachine actor to React. Uncontrolled (defaultModel) lets the
// actor own the document with full undo/redo; controlled (model) makes the prop
// the source of truth and routes every change through onModelChange. The
// actor/inspector stays in sync once the host round-trips `after` back into the
// `model` prop (it is not synced synchronously within dispatch).
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

  // Single notification path so dispatch and undo/redo stay in lockstep. The
  // Object.is guard makes a no-op transition (e.g. undo at the bottom of the
  // stack, where the history helper returns the same object) emit nothing, so we
  // never write spurious persistence on a change that did not happen.
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
      // onAction may veto (null) or replace the action before it mutates anything.
      const resolved = onAction ? onAction(action) : action;
      if (!resolved) {
        return;
      }
      // Uncontrolled: the actor owns history. Controlled: derive the next model by
      // hand (the host round-trips it through the model prop). normalize the
      // controlled `before` too, else a normalization-only id change fires spuriously.
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
    // actor history is always empty in controlled mode, so undo would be a dead
    // send that still emitted a spurious onModelChange.
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

  // Replace the whole document, resetting undo history. Drives an uncontrolled
  // reset (e.g. clearing a persisted layout back to its default) without a
  // remount; normalized at the boundary like every other entry point.
  const setModel = useCallback(
    (next: Dashfoo) => {
      actorRef.send({ model: normalize(next), type: "SET_MODEL" });
    },
    [actorRef],
  );

  // Functions, not booleans: they read the live actor snapshot so a caller
  // reading them right after undo/redo (e.g. inside onModelChange) sees the fresh
  // value, not the one-render-stale useSelector result. Memoized so callers can
  // hold the whole store in hook deps without their memoization dissolving on
  // every render.
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

"use client";

import type { Action, Dashfoo } from "@dashfoo/core";
import { canRedo, canUndo, dashfooMachine, normalize, reducer } from "@dashfoo/core";
import { useActorRef, useSelector } from "@xstate/react";
import { useCallback, useEffect } from "react";

type DashfooStore = {
  canRedo: boolean;
  canUndo: boolean;
  dispatch: (action: Action) => void;
  model: Dashfoo;
  redo: () => void;
  undo: () => void;
};

type UseDashfooStoreOptions = {
  defaultModel?: Dashfoo;
  model?: Dashfoo;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
};

// Binds a dashfooMachine actor to React. Uncontrolled (defaultModel) lets the
// actor own the document with full undo/redo; controlled (model) makes the prop
// the source of truth and routes every change through onModelChange, keeping the
// actor synced so the inspector still sees it.
const useDashfooStore = (options: UseDashfooStoreOptions): DashfooStore => {
  const { defaultModel, model: controlledModel, onModelChange } = options;
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
      if (controlledModel !== undefined) {
        onModelChange?.(reducer(controlledModel, action), action);
        return;
      }
      actorRef.send({ action, type: "DISPATCH" });
      onModelChange?.(actorRef.getSnapshot().context.history.present, action);
    },
    [actorRef, controlledModel, onModelChange],
  );

  const undo = useCallback(() => {
    actorRef.send({ type: "UNDO" });
    onModelChange?.(actorRef.getSnapshot().context.history.present);
  }, [actorRef, onModelChange]);

  const redo = useCallback(() => {
    actorRef.send({ type: "REDO" });
    onModelChange?.(actorRef.getSnapshot().context.history.present);
  }, [actorRef, onModelChange]);

  return {
    canRedo: canRedo(history),
    canUndo: canUndo(history),
    dispatch,
    model,
    redo,
    undo,
  };
};

export { useDashfooStore };
export type { DashfooStore, UseDashfooStoreOptions };

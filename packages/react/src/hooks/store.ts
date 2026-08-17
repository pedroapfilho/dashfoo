"use client";

import type { Action, Dashfoo } from "@dashfoo/core";
import { canRedo, canUndo, dashfooMachine, normalize, reducer } from "@dashfoo/core";
import { useActorRef, useSelector } from "@xstate/react";
import { useCallback, useMemo, useState } from "react";

import { warnOnce } from "../lib/warn-once";

const CONTROLLED_HISTORY_MESSAGE =
  "undo/redo are unavailable while `model` is controlled; keep the history in the state you own and drive it through onModelChange";

const CONTROLLED_SET_MODEL_MESSAGE =
  "setModel (and resetLayout) do nothing while `model` is controlled; set the model you own instead";

const CONTROLLED_MODE_SWITCH_MESSAGE =
  "`model` was added or removed after mount; a layout is controlled or uncontrolled for its whole life, so the first render wins. Remount (key=…) to switch";

const CONTROLLED_WITH_DEFAULT_MESSAGE =
  "`model` and `defaultModel` were both passed; `model` wins and `defaultModel` (and `persist`) are ignored";

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

  const actorRef = useActorRef(dashfooMachine, { input: { model: normalize(initialModel) } });
  const history = useSelector(actorRef, (snapshot) => snapshot.context.history);

  const model = useMemo(
    () => (controlledModel === undefined ? history.present : normalize(controlledModel)),
    [controlledModel, history.present],
  );

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

      if (controlled) {
        notify(model, reducer(model, resolved), resolved);
        return;
      }

      const before = actorRef.getSnapshot().context.history.present;
      actorRef.send({ action: resolved, type: "DISPATCH" });
      notify(before, actorRef.getSnapshot().context.history.present, resolved);
    },
    [actorRef, controlled, model, notify, onAction],
  );

  const undo = useCallback(() => {
    if (controlled) {
      warnOnce("controlled-undo", CONTROLLED_HISTORY_MESSAGE);
      return;
    }
    const before = actorRef.getSnapshot().context.history.present;
    actorRef.send({ type: "UNDO" });
    notify(before, actorRef.getSnapshot().context.history.present);
  }, [actorRef, controlled, notify]);

  const redo = useCallback(() => {
    if (controlled) {
      warnOnce("controlled-redo", CONTROLLED_HISTORY_MESSAGE);
      return;
    }
    const before = actorRef.getSnapshot().context.history.present;
    actorRef.send({ type: "REDO" });
    notify(before, actorRef.getSnapshot().context.history.present);
  }, [actorRef, controlled, notify]);

  const setModel = useCallback(
    (next: Dashfoo) => {
      if (controlled) {
        warnOnce("controlled-set-model", CONTROLLED_SET_MODEL_MESSAGE);
        return;
      }
      actorRef.send({ model: normalize(next), type: "SET_MODEL" });
    },
    [actorRef, controlled],
  );

  return useMemo(
    () => ({
      canRedo: () => !controlled && canRedo(actorRef.getSnapshot().context.history),
      canUndo: () => !controlled && canUndo(actorRef.getSnapshot().context.history),
      dispatch,
      model,
      redo,
      setModel,
      undo,
    }),
    [actorRef, controlled, dispatch, model, redo, setModel, undo],
  );
};

export { useDashfooStore };
export type { DashfooStore, UseDashfooStoreOptions };

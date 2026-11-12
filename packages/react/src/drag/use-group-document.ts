"use client";

import type { Action, Dashfoo } from "@dashfoo/core";
import { useEffect, useLayoutEffect, useRef } from "react";

import type { DragGroupScope } from "./drag-group";
import { registerDocument } from "./drag-group";

type GroupDocumentOptions = {
  dispatch: (action: Action) => void;
  documentId: string;
  dragGroup: string | undefined;
  dragGroupScope: DragGroupScope | undefined;
  model: Dashfoo;
};

/** Registers the layout so drops and tear-offs elsewhere can read its latest model and dispatch to it. */
const useGroupDocument = ({
  dispatch,
  documentId,
  dragGroup,
  dragGroupScope = "origin",
  model,
}: GroupDocumentOptions): void => {
  const latest = useRef({ dispatch, model });

  useLayoutEffect(() => {
    latest.current = { dispatch, model };
  });

  useEffect(
    () =>
      registerDocument(documentId, {
        dispatch: (action) => {
          latest.current.dispatch(action);
        },
        getModel: () => latest.current.model,
        group: dragGroup,
        scope: dragGroupScope,
      }),
    [documentId, dragGroup, dragGroupScope],
  );
};

export { useGroupDocument };

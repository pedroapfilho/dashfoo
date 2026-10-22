"use client";

import type { Action, dragDockMachine, DragSubject, DropIntent, Point } from "@dashfoo/core";
import { createContext } from "react";
import type { ActorRefFrom } from "xstate";

import type { DashfooDragManager } from "./drag-manager";

type DragActor = ActorRefFrom<typeof dragDockMachine>;

/**
 * One per rendered layer: the main tree, then one per float. `layerId`
 * namespaces droppable registrations, so two layers can hold a tabset with the
 * same model id.
 */
type RegisteredLayer = {
  commit: (action: Action, subject: DragSubject) => void;
  layerId: string;
  resolveIntent: (
    subject: DragSubject,
    tabsetId: string,
    element: HTMLElement,
    point: Point,
  ) => DropIntent | null;
};

/** The root's value with `layerId: null`; each `Layout.DragLayer` republishes it with its own id. */
type DragContextValue = {
  actorRef: DragActor;
  layerId: string | null;
  manager: DashfooDragManager;
  registerLayer: (layer: RegisteredLayer) => () => void;
};

const DragContext = createContext<DragContextValue | null>(null);

export { DragContext };

export type { DragActor, DragContextValue, RegisteredLayer };

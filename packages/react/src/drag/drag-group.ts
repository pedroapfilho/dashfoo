import type { Dashfoo, DragSubject, TabNode, TabsetNode } from "@dashfoo/core";
import { findTab, findTabset, warn } from "@dashfoo/core";

import type { LayoutStore } from "../layout/layout-store";

import { readAccepted } from "./native-wire";

type InternalSubject = Extract<DragSubject, { kind: "tab" | "tabset" }>;

type TransferNode = TabNode | TabsetNode;

/** `"origin"`: any copy of the app on this origin (other windows and browser tabs). `"app"`: this copy only. */
type DragGroupScope = "app" | "origin";

/** A layout that can hand nodes over: one in this copy of the app, or the remote source of a cross-app drop. */
type GroupDocument = {
  appId: string;
  group: string | undefined;
  release: (subject: InternalSubject) => void;
  scope: DragGroupScope;
  take: (subject: InternalSubject) => TransferNode | undefined;
};

type RemoteDocument = GroupDocument & { documentId: string };

const CHANNEL_NAME = "dashfoo-drag";

let currentAppId: string | undefined;

/** Lazy, so a server render never mints one. */
const appId = (): string => {
  currentAppId ??= crypto.randomUUID();

  return currentAppId;
};

const documents = new Map<string, LayoutStore>();

let remote: RemoteDocument | null = null;

const nodeOf = (model: Dashfoo, subject: InternalSubject): TransferNode | undefined =>
  subject.kind === "tab" ? findTab(model, subject.id)?.tab : findTabset(model, subject.id);

/** Every `Layout.Root` registers, so drops and tear-offs can reach the layout a drag left. */
const registerDocument = (documentId: string, store: LayoutStore): (() => void) => {
  if (documents.has(documentId)) {
    warn(
      `two layouts share the document id "${documentId}"; give each React root its own identifierPrefix`,
    );
  }

  documents.set(documentId, store);

  return () => {
    if (documents.get(documentId) === store) {
      documents.delete(documentId);
    }
  };
};

const localDocument = (store: LayoutStore): GroupDocument => {
  const { dragGroup, dragGroupScope } = store.getState();

  return {
    appId: appId(),
    group: dragGroup,
    release: (subject) => {
      store.getState().dispatch({ nodeId: subject.id, type: "transferOut" });
    },
    scope: dragGroupScope,
    take: (subject) => nodeOf(store.getState().model, subject),
  };
};

/** Only one cross-app drag can be in flight, so one slot holds its source. */
const setRemoteDocument = (next: RemoteDocument | null): void => {
  remote = next;
};

const sourceDocument = (documentId: string): GroupDocument | undefined => {
  const store = documents.get(documentId);

  if (store) {
    return localDocument(store);
  }

  return remote?.documentId === documentId ? remote : undefined;
};

const canExchange = (
  target: { group: string | undefined; scope: DragGroupScope },
  source: GroupDocument,
): boolean =>
  target.group !== undefined &&
  source.group === target.group &&
  (source.appId === appId() || (source.scope === "origin" && target.scope === "origin"));

/** Tab ids travel with the node, so they must be new to the receiving layout. */
const collides = (model: Dashfoo, node: TransferNode): boolean =>
  (node.type === "tab" ? [node] : node.children).some(
    (tab) => findTab(model, tab.id) !== undefined,
  );

const offers = new Map<string, () => void>();

let channel: BroadcastChannel | null = null;

const acceptChannel = (): BroadcastChannel | null => {
  if (channel === null && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      const dragId = readAccepted(event);

      if (dragId !== undefined) {
        offers.get(dragId)?.();
        offers.delete(dragId);
      }
    });
  }

  return channel;
};

/** The source's side of a cross-app drop: `release` runs when another copy of the app accepts drag `dragId`. */
const offerRelease = (dragId: string, release: () => void): void => {
  offers.set(dragId, release);
  acceptChannel();
};

/** `false` when another copy of the app had already accepted the drag. */
const withdrawOffer = (dragId: string): boolean => offers.delete(dragId);

const confirmAccepted = (dragId: string): void => {
  acceptChannel()?.postMessage({ accepted: dragId });
};

export {
  appId,
  canExchange,
  collides,
  confirmAccepted,
  offerRelease,
  registerDocument,
  setRemoteDocument,
  sourceDocument,
  withdrawOffer,
};

export type { DragGroupScope, GroupDocument, InternalSubject, TransferNode };

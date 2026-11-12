import type { Dashfoo, DragSubject, TabNode, TabsetNode } from "@dashfoo/core";
import { findTab, findTabset, warn } from "@dashfoo/core";

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

type LocalDocument = Omit<GroupDocument, "appId" | "release" | "take"> & {
  dispatch: (action: { nodeId: string; type: "transferOut" }) => void;
  getModel: () => Dashfoo;
};

let currentAppId: string | undefined;

/** Lazy, so a server render never mints one. */
const appId = (): string => {
  currentAppId ??= crypto.randomUUID();

  return currentAppId;
};

const documents = new Map<string, GroupDocument & { getModel: () => Dashfoo }>();

let remote: (GroupDocument & { documentId: string }) | null = null;

const nodeOf = (model: Dashfoo, subject: InternalSubject): TransferNode | undefined =>
  subject.kind === "tab" ? findTab(model, subject.id)?.tab : findTabset(model, subject.id);

/** Every `Layout.Root` registers, so drops and tear-offs can reach the model of the layout a drag left. */
const registerDocument = (documentId: string, local: LocalDocument): (() => void) => {
  if (documents.has(documentId)) {
    warn(
      `two layouts share the document id "${documentId}"; give each React root its own identifierPrefix`,
    );
  }

  const entry = {
    ...local,
    appId: appId(),
    release: (subject: InternalSubject) => {
      local.dispatch({ nodeId: subject.id, type: "transferOut" });
    },
    take: (subject: InternalSubject) => nodeOf(local.getModel(), subject),
  };

  documents.set(documentId, entry);

  return () => {
    if (documents.get(documentId) === entry) {
      documents.delete(documentId);
    }
  };
};

const localModel = (documentId: string): Dashfoo | undefined =>
  documents.get(documentId)?.getModel();

/** Only one cross-app drag can be in flight, so one slot holds its source. */
const setRemoteDocument = (next: (GroupDocument & { documentId: string }) | null): void => {
  remote = next;
};

const sourceDocument = (documentId: string): GroupDocument | undefined =>
  documents.get(documentId) ?? (remote?.documentId === documentId ? remote : undefined);

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

export {
  appId,
  canExchange,
  collides,
  localModel,
  registerDocument,
  setRemoteDocument,
  sourceDocument,
};

export type { DragGroupScope, GroupDocument, InternalSubject, LocalDocument, TransferNode };

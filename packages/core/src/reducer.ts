import type { Action } from "./actions";
import { normalize } from "./invariants";
import type { Dashfoo, RowNode, TabNode, TabsetNode } from "./schema";
import { findBorder, findTab, findTabset } from "./tree";

const assertNever = (value: never): never => {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`);
};

const findRow = (row: RowNode, id: string): RowNode | undefined => {
  if (row.id === id) {
    return row;
  }
  for (const child of row.children) {
    if (child.type === "row") {
      const found = findRow(child, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
};

const removeTabset = (row: RowNode, tabsetId: string): boolean => {
  const index = row.children.findIndex((child) => child.type === "tabset" && child.id === tabsetId);
  if (index !== -1) {
    row.children.splice(index, 1);
    return true;
  }
  for (const child of row.children) {
    if (child.type === "row" && removeTabset(child, tabsetId)) {
      return true;
    }
  }
  return false;
};

type AttributedNode = RowNode | TabNode | TabsetNode;

const findAttributedNodeInRow = (row: RowNode, id: string): AttributedNode | undefined => {
  if (row.id === id) {
    return row;
  }
  for (const child of row.children) {
    if (child.type === "row") {
      const found = findAttributedNodeInRow(child, id);
      if (found) {
        return found;
      }
      continue;
    }
    if (child.id === id) {
      return child;
    }
    const tab = child.children.find((candidate) => candidate.id === id);
    if (tab) {
      return tab;
    }
  }
  return undefined;
};

const findAttributedNode = (model: Dashfoo, id: string): AttributedNode | undefined => {
  const inLayout = findAttributedNodeInRow(model.layout, id);
  if (inLayout) {
    return inLayout;
  }
  for (const border of model.borders) {
    const tab = border.children.find((candidate) => candidate.id === id);
    if (tab) {
      return tab;
    }
  }
  return undefined;
};

const applyAction = (draft: Dashfoo, action: Action): void => {
  switch (action.type) {
    case "adjustBorderSize": {
      const border = findBorder(draft, action.edge);
      if (border) {
        border.size = action.size;
      }
      return;
    }
    case "adjustSplit": {
      const row = findRow(draft.layout, action.rowId);
      if (!row) {
        return;
      }
      for (let index = 0; index < action.weights.length; index++) {
        const child = row.children[index];
        const weight = action.weights[index];
        if (child && weight !== undefined) {
          child.weight = weight;
        }
      }
      return;
    }
    case "deleteTab": {
      const location = findTab(draft, action.tabId);
      if (location) {
        location.container.children.splice(location.index, 1);
      }
      return;
    }
    case "deleteTabset": {
      removeTabset(draft.layout, action.tabsetId);
      return;
    }
    case "renameTab": {
      const location = findTab(draft, action.tabId);
      if (location) {
        location.tab.name = action.name;
      }
      return;
    }
    case "selectTab": {
      const tabset = findTabset(draft, action.tabsetId);
      if (tabset) {
        tabset.selected = action.index;
      }
      return;
    }
    case "setActiveTabset": {
      if (findTabset(draft, action.tabsetId)) {
        draft.activeTabsetId = action.tabsetId;
      }
      return;
    }
    case "setBorderSelected": {
      const border = findBorder(draft, action.edge);
      if (border) {
        border.selected = action.index;
      }
      return;
    }
    case "setMaximizedTabset": {
      draft.maximizedTabsetId = action.tabsetId ?? undefined;
      return;
    }
    case "updateGlobalAttributes": {
      Object.assign(draft.global, action.attrs);
      return;
    }
    case "updateNodeAttributes": {
      const node = findAttributedNode(draft, action.nodeId);
      if (node) {
        Object.assign(node, action.attrs);
      }
      return;
    }
    default: {
      assertNever(action);
    }
  }
};

// The canonical engine: deep-copy the model (so the input is never mutated),
// apply one action to the copy, then run the self-healing invariants so the
// result is always a valid, canonical model.
const reducer = (model: Dashfoo, action: Action): Dashfoo => {
  const draft = structuredClone(model);
  applyAction(draft, action);
  return normalize(draft);
};

export { reducer };

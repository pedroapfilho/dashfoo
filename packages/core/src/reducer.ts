import type { Action, DockLocation } from "./actions";
import { createNodeId } from "./ids";
import { normalize } from "./invariants";
import type { Dashfoo, RowNode, TabNode, TabsetNode } from "./schema";
import { findAttributedNode, findRow, findTab, findTabset, findTabsetParent } from "./tree";

const assertNever = (value: never): never => {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`);
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

// Detach a tabset from the tree and return it (for moving a whole tabset).
const removeTabsetReturning = (row: RowNode, tabsetId: string): TabsetNode | undefined => {
  const index = row.children.findIndex((child) => child.type === "tabset" && child.id === tabsetId);
  if (index !== -1) {
    const [removed] = row.children.splice(index, 1);
    return removed?.type === "tabset" ? removed : undefined;
  }
  for (const child of row.children) {
    if (child.type === "row") {
      const found = removeTabsetReturning(child, tabsetId);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
};

const splitOrientation = (location: DockLocation): "column" | "row" =>
  location === "split-left" || location === "split-right" ? "row" : "column";

const splitsBefore = (location: DockLocation): boolean =>
  location === "split-left" || location === "split-top";

// Place an (already-detached) tabset beside the target for a split-* location:
// reuse the parent row when the orientation already matches, else wrap the target
// in a new row. Shared by insertTab (a fresh tabset) and moveTabset (an existing
// one). Splits the target's space in half.
const placeBesideTarget = (
  draft: Dashfoo,
  placed: TabsetNode,
  targetId: string,
  location: DockLocation,
): void => {
  const targetTabset = findTabset(draft, targetId);
  const found = findTabsetParent(draft.layout, targetId);
  if (!targetTabset || !found) {
    return;
  }

  const orientation = splitOrientation(location);
  const before = splitsBefore(location);

  if (found.parent.orientation === orientation) {
    const targetWeight = targetTabset.weight ?? 100;
    targetTabset.weight = targetWeight / 2;
    placed.weight = targetWeight / 2;
    found.parent.children.splice(before ? found.index : found.index + 1, 0, placed);
  } else {
    const targetWeight = targetTabset.weight;
    targetTabset.weight = 50;
    placed.weight = 50;
    const newRow: RowNode = {
      children: before ? [placed, targetTabset] : [targetTabset, placed],
      id: createNodeId("row"),
      orientation,
      type: "row",
    };
    if (targetWeight !== undefined) {
      newRow.weight = targetWeight;
    }
    found.parent.children.splice(found.index, 1, newRow);
  }

  draft.activeTabsetId = placed.id;
};

// Insert a tab into the model at a dock target. center stacks it into the target
// tabset; split-* creates a new tabset beside the target.
type DropTarget = { id: string; index?: number; location: DockLocation };

const insertTab = (draft: Dashfoo, tab: TabNode, target: DropTarget): void => {
  const { id: targetId, index, location } = target;
  const targetTabset = findTabset(draft, targetId);
  if (!targetTabset) {
    return;
  }

  if (location === "center") {
    const at = index ?? targetTabset.children.length;
    targetTabset.children.splice(at, 0, tab);
    targetTabset.selected = at;
    return;
  }

  const newTabset: TabsetNode = {
    children: [tab],
    id: createNodeId("tabset"),
    selected: 0,
    type: "tabset",
    weight: 50,
  };
  placeBesideTarget(draft, newTabset, targetId, location);
};

const applyAction = (draft: Dashfoo, action: Action): void => {
  switch (action.type) {
    case "addNode": {
      insertTab(draft, action.tab, {
        id: action.targetId,
        index: action.index,
        location: action.location,
      });
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
    case "moveNode": {
      const source = findTab(draft, action.sourceId);
      if (!source) {
        return;
      }
      // Remove the source first; action.index is the destination slot measured
      // against the tabs that remain (the drag adapter excludes the dragged tab),
      // so it indexes the post-removal array directly — no reorder adjustment.
      const [removed] = source.container.children.splice(source.index, 1);
      if (!removed) {
        return;
      }
      insertTab(draft, removed, {
        id: action.targetId,
        index: action.index,
        location: action.location,
      });
      return;
    }
    case "moveTabset": {
      if (action.sourceId === action.targetId) {
        return;
      }
      const source = findTabset(draft, action.sourceId);
      if (!source) {
        return;
      }
      if (action.location === "center") {
        const target = findTabset(draft, action.targetId);
        if (target) {
          target.children.push(...source.children);
          removeTabset(draft.layout, action.sourceId);
        }
        return;
      }
      // split-* moves the whole tabset beside the target.
      if (action.location.startsWith("split-")) {
        const detached = removeTabsetReturning(draft.layout, action.sourceId);
        if (detached) {
          placeBesideTarget(draft, detached, action.targetId, action.location);
        }
      }
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

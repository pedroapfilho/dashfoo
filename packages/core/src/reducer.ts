import type { Action, DockLocation } from "./actions";
import { normalize } from "./invariants";
import type { Dashfoo, Edge, RowNode, TabNode, TabsetNode } from "./schema";
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

const genId = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`;

const findTabsetParent = (
  row: RowNode,
  tabsetId: string,
): { index: number; parent: RowNode } | undefined => {
  const index = row.children.findIndex((child) => child.type === "tabset" && child.id === tabsetId);
  if (index !== -1) {
    return { index, parent: row };
  }
  for (const child of row.children) {
    if (child.type === "row") {
      const found = findTabsetParent(child, tabsetId);
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

const borderEdgeOf = (location: DockLocation): Edge | undefined => {
  switch (location) {
    case "border-bottom": {
      return "bottom";
    }
    case "border-left": {
      return "left";
    }
    case "border-right": {
      return "right";
    }
    case "border-top": {
      return "top";
    }
    default: {
      return undefined;
    }
  }
};

// Insert a tab into the model at a dock target. center stacks it into the target
// tabset; split-* creates a new tabset beside the target (reusing the parent row
// when the orientation already matches, otherwise wrapping in a new row); border-*
// docks it to a frame edge, creating the border on demand.
type DropTarget = { id: string; index?: number; location: DockLocation };

const insertTab = (draft: Dashfoo, tab: TabNode, target: DropTarget): void => {
  const { id: targetId, index, location } = target;
  const edge = borderEdgeOf(location);
  if (edge) {
    let border = findBorder(draft, edge);
    if (!border) {
      border = { children: [], edge, selected: -1, type: "border" };
      draft.borders.push(border);
    }
    const at = index ?? border.children.length;
    border.children.splice(at, 0, tab);
    border.selected = at;
    return;
  }

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

  const found = findTabsetParent(draft.layout, targetId);
  if (!found) {
    return;
  }

  const orientation = splitOrientation(location);
  const before = splitsBefore(location);
  const newTabset: TabsetNode = {
    children: [tab],
    id: genId("tabset"),
    selected: 0,
    type: "tabset",
    weight: 50,
  };

  if (found.parent.orientation === orientation) {
    const targetWeight = targetTabset.weight ?? 100;
    targetTabset.weight = targetWeight / 2;
    newTabset.weight = targetWeight / 2;
    found.parent.children.splice(before ? found.index : found.index + 1, 0, newTabset);
  } else {
    const targetWeight = targetTabset.weight;
    targetTabset.weight = 50;
    const newRow: RowNode = {
      children: before ? [newTabset, targetTabset] : [targetTabset, newTabset],
      id: genId("row"),
      orientation,
      type: "row",
    };
    if (targetWeight !== undefined) {
      newRow.weight = targetWeight;
    }
    found.parent.children.splice(found.index, 1, newRow);
  }

  draft.activeTabsetId = newTabset.id;
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

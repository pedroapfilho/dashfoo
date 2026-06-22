import type { Dashfoo, RowNode, TabNode, TabsetNode, WindowNode } from "./schema";

// A tab lives inside a tabset.
type TabContainer = TabsetNode;
type TabLocation = { container: TabContainer; index: number; tab: TabNode };

// Every layout root: the main layout first, then each detached window's layout.
// Traversals fan out over this so a popped-out tabset is as reachable as a docked
// one; "first" semantics (active tabset fallbacks) prefer the main layout.
const collectRoots = (model: Dashfoo): Array<RowNode> => [
  model.layout,
  ...(model.windows ?? []).map((window) => window.layout),
];

const findWindow = (model: Dashfoo, windowId: string): WindowNode | undefined =>
  (model.windows ?? []).find((window) => window.id === windowId);

const collectTabsetsInRow = (row: RowNode, acc: Array<TabsetNode>): void => {
  for (const child of row.children) {
    if (child.type === "tabset") {
      acc.push(child);
    } else {
      collectTabsetsInRow(child, acc);
    }
  }
};

// Every tabset across all roots (main layout + windows), depth-first.
const collectTabsets = (model: Dashfoo): Array<TabsetNode> => {
  const acc: Array<TabsetNode> = [];
  for (const root of collectRoots(model)) {
    collectTabsetsInRow(root, acc);
  }
  return acc;
};

const getFirstTabset = (model: Dashfoo): TabsetNode | undefined => collectTabsets(model)[0];

const findTabset = (model: Dashfoo, tabsetId: string): TabsetNode | undefined =>
  collectTabsets(model).find((tabset) => tabset.id === tabsetId);

const findTabInContainer = (container: TabContainer, tabId: string): TabLocation | undefined => {
  const index = container.children.findIndex((tab) => tab.id === tabId);
  if (index === -1) {
    return undefined;
  }

  const tab = container.children[index];
  if (!tab) {
    return undefined;
  }

  return { container, index, tab };
};

// Locate a tab anywhere in the model — searching every tabset — returning the
// tab, its container, and its index within that container.
const findTab = (model: Dashfoo, tabId: string): TabLocation | undefined => {
  for (const tabset of collectTabsets(model)) {
    const found = findTabInContainer(tabset, tabId);
    if (found) {
      return found;
    }
  }

  return undefined;
};

type AttributedNode = RowNode | TabNode | TabsetNode;

// Find a row anywhere in the layout tree by id.
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
    // Single-id recursive search invoked once per lookup over small layout
    // trees — building a Map per call would cost more than it saves.
    // oxlint-disable-next-line react-doctor/js-index-maps
    const tab = child.children.find((candidate) => candidate.id === id);
    if (tab) {
      return tab;
    }
  }
  return undefined;
};

// Locate any attributed node (row, tabset, or tab) by id — backs updateNodeAttributes.
const findAttributedNode = (model: Dashfoo, id: string): AttributedNode | undefined => {
  for (const root of collectRoots(model)) {
    const found = findAttributedNodeInRow(root, id);
    if (found) {
      return found;
    }
  }
  return undefined;
};

// The root row (main layout or a window's layout) whose subtree contains the
// node. Lets the reducer run root-relative surgery (findRow, findTabsetParent,
// removeTabset) against the correct tree instead of assuming the main layout.
const findRootContaining = (model: Dashfoo, nodeId: string): RowNode | undefined => {
  for (const root of collectRoots(model)) {
    if (findAttributedNodeInRow(root, nodeId)) {
      return root;
    }
  }
  return undefined;
};

// The row holding a tabset, and the tabset's index within it — backs split placement.
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

const collectIdsInRow = (row: RowNode, acc: Array<string>): void => {
  acc.push(row.id);
  for (const child of row.children) {
    if (child.type === "row") {
      collectIdsInRow(child, acc);
    } else {
      acc.push(child.id);
      for (const tab of child.children) {
        acc.push(tab.id);
      }
    }
  }
};

// Ids that appear more than once across the whole model (rows, tabsets, tabs).
// Duplicate ids produce duplicate React keys and corrupt the resize/drag
// plumbing, so this backs a load-time diagnostic.
const findDuplicateIds = (model: Dashfoo): Array<string> => {
  const ids: Array<string> = [];
  for (const window of model.windows ?? []) {
    ids.push(window.id);
  }
  for (const root of collectRoots(model)) {
    collectIdsInRow(root, ids);
  }
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  return [...duplicates];
};

export {
  collectRoots,
  collectTabsets,
  findAttributedNode,
  findDuplicateIds,
  findRootContaining,
  findRow,
  findTab,
  findTabset,
  findTabsetParent,
  findWindow,
  getFirstTabset,
};
export type { AttributedNode, TabContainer, TabLocation };

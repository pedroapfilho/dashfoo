import type { Dashfoo, FloatNode, RowNode, TabNode, TabsetNode } from "./schema";

type TabContainer = TabsetNode;
type TabLocation = { container: TabContainer; index: number; tab: TabNode };

const collectRoots = (model: Dashfoo): Array<RowNode> => [
  model.layout,
  ...(model.floats ?? []).map((float) => float.layout),
];

const findFloat = (model: Dashfoo, floatId: string): FloatNode | undefined =>
  (model.floats ?? []).find((float) => float.id === floatId);

const collectTabsetsInRow = (row: RowNode, acc: Array<TabsetNode>): void => {
  for (const child of row.children) {
    if (child.type === "tabset") {
      acc.push(child);
    } else {
      collectTabsetsInRow(child, acc);
    }
  }
};

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

  const tab = container.children.at(index);
  if (!tab) {
    return undefined;
  }

  return { container, index, tab };
};

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

    // oxlint-disable-next-line react-doctor/js-index-maps
    const tab = child.children.find((candidate) => candidate.id === id);
    if (tab) {
      return tab;
    }
  }
  return undefined;
};

const findAttributedNode = (model: Dashfoo, id: string): AttributedNode | undefined => {
  for (const root of collectRoots(model)) {
    const found = findAttributedNodeInRow(root, id);
    if (found) {
      return found;
    }
  }
  return undefined;
};

const findRootContaining = (model: Dashfoo, nodeId: string): RowNode | undefined => {
  for (const root of collectRoots(model)) {
    if (findAttributedNodeInRow(root, nodeId)) {
      return root;
    }
  }
  return undefined;
};

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

const findDuplicateIds = (model: Dashfoo): Array<string> => {
  const ids: Array<string> = [];
  for (const float of model.floats ?? []) {
    ids.push(float.id);
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
  collectTabsetsInRow,
  findAttributedNode,
  findDuplicateIds,
  findFloat,
  findRootContaining,
  findRow,
  findTab,
  findTabset,
  findTabsetParent,
  getFirstTabset,
};
export type { AttributedNode, TabContainer, TabLocation };

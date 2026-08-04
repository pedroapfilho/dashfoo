import type { Dashfoo, FloatNode, RowNode, TabNode, TabsetNode } from "./schema";

type TabContainer = TabsetNode;
type TabLocation = { container: TabContainer; index: number; tab: TabNode };

const collectRoots = (model: Dashfoo): Array<RowNode> => [
  model.layout,
  ...model.floats.map((float) => float.layout),
];

const findFloat = (model: Dashfoo, floatId: string): FloatNode | undefined =>
  model.floats.find((float) => float.id === floatId);

type AttributedNode = RowNode | TabNode | TabsetNode;

type Visit = {
  index: number;
  node: AttributedNode;
  // A tabset's parent is always a row, a tab's is always a tabset; only a
  // walk's own root has none.
  parent: RowNode | TabsetNode | undefined;
};

/**
 * Depth-first pre-order over one root: the row itself, then each child in
 * order, descending into nested rows and into a tabset's tabs. Returning a
 * defined value from `visit` stops the walk and becomes the result, so one
 * traversal serves both find-first and collect-all.
 *
 * Every query below used to carry its own copy of this recursion, and they had
 * drifted in child order: some scanned a row's own tabsets before descending,
 * others interleaved. With unique ids all orders agree, so they now share this
 * one; a model with duplicate ids (which the builder and the parser both warn
 * about) can see a different duplicate win than it did before.
 */
const walk = <T>(
  row: RowNode,
  visit: (found: Visit) => T | undefined,
  parent?: RowNode,
  index = -1,
): T | undefined => {
  const atRoot = visit({ index, node: row, parent });
  if (atRoot !== undefined) {
    return atRoot;
  }
  for (const [childIndex, child] of row.children.entries()) {
    if (child.type === "row") {
      const inRow = walk(child, visit, row, childIndex);
      if (inRow !== undefined) {
        return inRow;
      }
      continue;
    }
    const atTabset = visit({ index: childIndex, node: child, parent: row });
    if (atTabset !== undefined) {
      return atTabset;
    }
    for (const [tabIndex, tab] of child.children.entries()) {
      const atTab = visit({ index: tabIndex, node: tab, parent: child });
      if (atTab !== undefined) {
        return atTab;
      }
    }
  }
  return undefined;
};

const locate = (row: RowNode, id: string): Visit | undefined =>
  walk(row, (found) => (found.node.id === id ? found : undefined));

const collectTabsetsInRow = (row: RowNode, acc: Array<TabsetNode>): void => {
  walk(row, ({ node }) => {
    if (node.type === "tabset") {
      acc.push(node);
    }
    return undefined;
  });
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

const findRow = (row: RowNode, id: string): RowNode | undefined => {
  const found = locate(row, id)?.node;
  return found?.type === "row" ? found : undefined;
};

const findAttributedNodeInRow = (row: RowNode, id: string): AttributedNode | undefined =>
  locate(row, id)?.node;

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
  const found = locate(row, tabsetId);
  return found?.node.type === "tabset" && found.parent?.type === "row"
    ? { index: found.index, parent: found.parent }
    : undefined;
};

const collectIdsInRow = (row: RowNode, acc: Array<string>): void => {
  walk(row, ({ node }) => {
    acc.push(node.id);
    return undefined;
  });
};

const findDuplicateIds = (model: Dashfoo): Array<string> => {
  const ids: Array<string> = [];
  for (const float of model.floats) {
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

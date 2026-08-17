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
  parent: RowNode | TabsetNode | undefined;
};

/**
 * Depth-first pre-order; a defined `visit` result stops the walk. With unique
 * ids the order is immaterial, but a duplicate-id model (which the builder and
 * the parser both warn about) resolves to whichever copy this reaches first.
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

type Located<N extends AttributedNode> = {
  index: number;
  node: N;
  parent: RowNode | TabsetNode | undefined;
};

const isRow = (node: AttributedNode): node is RowNode => node.type === "row";
const isTab = (node: AttributedNode): node is TabNode => node.type === "tab";
const isTabset = (node: AttributedNode): node is TabsetNode => node.type === "tabset";

/** Predicate-first, so an id shared across node kinds resolves the same way here as anywhere else. */
const locate = <N extends AttributedNode>(
  model: Dashfoo,
  id: string,
  is: (node: AttributedNode) => node is N,
): Located<N> | undefined => {
  for (const root of collectRoots(model)) {
    const found = walk(root, ({ index, node, parent }) =>
      node.id === id && is(node) ? { index, node, parent } : undefined,
    );
    if (found) {
      return found;
    }
  }
  return undefined;
};

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
  locate(model, tabsetId, isTabset)?.node;

const findTab = (model: Dashfoo, tabId: string): TabLocation | undefined => {
  const found = locate(model, tabId, isTab);
  return found?.parent?.type === "tabset"
    ? { container: found.parent, index: found.index, tab: found.node }
    : undefined;
};

const findRow = (model: Dashfoo, id: string): RowNode | undefined => locate(model, id, isRow)?.node;

const findAttributedNode = (model: Dashfoo, id: string): AttributedNode | undefined => {
  for (const root of collectRoots(model)) {
    const found = walk(root, ({ node }) => (node.id === id ? node : undefined));
    if (found) {
      return found;
    }
  }
  return undefined;
};

const findRootContaining = (model: Dashfoo, nodeId: string): RowNode | undefined => {
  for (const root of collectRoots(model)) {
    const hit = walk(root, ({ node }) => (node.id === nodeId ? true : undefined));
    if (hit) {
      return root;
    }
  }
  return undefined;
};

const findTabsetParent = (
  model: Dashfoo,
  tabsetId: string,
): { index: number; parent: RowNode } | undefined => {
  const found = locate(model, tabsetId, isTabset);
  return found?.parent?.type === "row" ? { index: found.index, parent: found.parent } : undefined;
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

import type { BorderNode, Dashfoo, Edge, RowNode, TabNode, TabsetNode } from "./schema";

// A tab lives inside a tabset (in the layout) or directly inside a border.
type TabContainer = BorderNode | TabsetNode;
type TabLocation = { container: TabContainer; index: number; tab: TabNode };

const collectTabsetsInRow = (row: RowNode, acc: Array<TabsetNode>): void => {
  for (const child of row.children) {
    if (child.type === "tabset") {
      acc.push(child);
    } else {
      collectTabsetsInRow(child, acc);
    }
  }
};

// Every tabset in the layout tree, depth-first. Borders are not tabsets.
const collectTabsets = (model: Dashfoo): Array<TabsetNode> => {
  const acc: Array<TabsetNode> = [];
  collectTabsetsInRow(model.layout, acc);
  return acc;
};

const getFirstTabset = (model: Dashfoo): TabsetNode | undefined => collectTabsets(model)[0];

const findTabset = (model: Dashfoo, tabsetId: string): TabsetNode | undefined =>
  collectTabsets(model).find((tabset) => tabset.id === tabsetId);

const findBorder = (model: Dashfoo, edge: Edge): BorderNode | undefined =>
  model.borders.find((border) => border.edge === edge);

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

// Locate a tab anywhere in the model — searching every tabset and every border —
// returning the tab, its container, and its index within that container.
const findTab = (model: Dashfoo, tabId: string): TabLocation | undefined => {
  for (const tabset of collectTabsets(model)) {
    const found = findTabInContainer(tabset, tabId);
    if (found) {
      return found;
    }
  }

  for (const border of model.borders) {
    const found = findTabInContainer(border, tabId);
    if (found) {
      return found;
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

// Ids that appear more than once across the whole model (rows, tabsets, tabs,
// border tabs). Duplicate ids produce duplicate React keys and corrupt the
// resize/drag plumbing, so this backs a load-time diagnostic.
const findDuplicateIds = (model: Dashfoo): Array<string> => {
  const ids: Array<string> = [];
  collectIdsInRow(model.layout, ids);
  for (const border of model.borders) {
    for (const tab of border.children) {
      ids.push(tab.id);
    }
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

export { collectTabsets, findBorder, findDuplicateIds, findTab, findTabset, getFirstTabset };
export type { TabContainer, TabLocation };

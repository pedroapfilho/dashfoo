import { createNodeId } from "../model/ids";
import type { Dashfoo, RowNode, TabNode, TabsetNode } from "../model/schema";
import { findRootContaining, findTabset, findTabsetParent } from "../model/tree";

import type { DockLocation } from "./actions";

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

const placeBesideTarget = (
  draft: Dashfoo,
  placed: TabsetNode,
  targetId: string,
  location: DockLocation,
): void => {
  const targetTabset = findTabset(draft, targetId);

  const targetRoot = findRootContaining(draft, targetId) ?? draft.layout;
  const found = findTabsetParent(targetRoot, targetId);
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

const mergeTabsInto = (target: TabsetNode, tabs: Array<TabNode>, selectedOffset: number): void => {
  const mergeStart = target.children.length;
  target.children.push(...tabs);
  target.selected = mergeStart + selectedOffset;
};

const wrapTabInLayout = (tab: TabNode): RowNode => ({
  children: [{ children: [tab], id: createNodeId("tabset"), selected: 0, type: "tabset" }],
  id: createNodeId("row"),
  orientation: "row",
  type: "row",
});

const wrapTabsetInLayout = (tabset: TabsetNode): RowNode => ({
  children: [tabset],
  id: createNodeId("row"),
  orientation: "row",
  type: "row",
});

export {
  insertTab,
  mergeTabsInto,
  placeBesideTarget,
  removeTabset,
  removeTabsetReturning,
  wrapTabInLayout,
  wrapTabsetInLayout,
};
export type { DropTarget };

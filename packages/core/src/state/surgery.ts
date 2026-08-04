import { splitEdge } from "../geometry/geometry";
import { clampSelected } from "../lib/clamp-selected";
import { createNodeId } from "../model/ids";
import type { Dashfoo, Orientation, RowNode, TabNode, TabsetNode } from "../model/schema";
import { DEFAULT_WEIGHT } from "../model/schema";
import type { TabContainer } from "../model/tree";
import { findRootContaining, findTabset, findTabsetParent } from "../model/tree";

import type { DockLocation } from "./actions";

const removeTabsetReturning = (row: RowNode, tabsetId: string): TabsetNode | undefined => {
  const found = findTabsetParent(row, tabsetId);
  if (!found) {
    return undefined;
  }
  const [removed] = found.parent.children.splice(found.index, 1);
  return removed?.type === "tabset" ? removed : undefined;
};

const removeTabset = (row: RowNode, tabsetId: string): boolean =>
  removeTabsetReturning(row, tabsetId) !== undefined;

const splitPlacement = (location: DockLocation): { before: boolean; orientation: Orientation } => {
  const edge = splitEdge(location);
  return {
    before: edge === "left" || edge === "top",
    orientation: edge === "left" || edge === "right" ? "row" : "column",
  };
};

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

  const { before, orientation } = splitPlacement(location);

  if (found.parent.orientation === orientation) {
    const half = targetTabset.weight / 2;
    targetTabset.weight = half;
    placed.weight = half;
    found.parent.children.splice(before ? found.index : found.index + 1, 0, placed);
  } else {
    // The wrapping row takes over the slot the target held, so it inherits the
    // target's weight while the two halves split its interior evenly.
    const newRow: RowNode = {
      children: before ? [placed, targetTabset] : [targetTabset, placed],
      id: createNodeId("row"),
      orientation,
      type: "row",
      weight: targetTabset.weight,
    };
    targetTabset.weight = 50;
    placed.weight = 50;
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
    // `index` is caller-supplied and only validated as an integer. Splice pins
    // an out-of-range one to an end of the strip, so `selected` has to be
    // pinned the same way or it points past the tab it was meant to follow.
    const at = Math.min(
      Math.max(index ?? targetTabset.children.length, 0),
      targetTabset.children.length,
    );
    targetTabset.children.splice(at, 0, tab);
    targetTabset.selected = at;
    return;
  }

  const newTabset: TabsetNode = {
    children: [tab],
    id: createNodeId("tabset"),
    selected: 0,
    type: "tabset",
    weight: DEFAULT_WEIGHT,
  };
  placeBesideTarget(draft, newTabset, targetId, location);
};

/**
 * Removing a tab can leave `selected` past the end of the strip, so every
 * detach re-clamps its container rather than leaving the whole tree to be
 * re-walked afterwards.
 */
const detachTab = (container: TabContainer, index: number): TabNode | undefined => {
  const removed = container.children.splice(index, 1).at(0);
  container.selected = clampSelected(container.children.length, container.selected);
  return removed;
};

const mergeTabsInto = (target: TabsetNode, tabs: Array<TabNode>, selectedOffset: number): void => {
  const mergeStart = target.children.length;
  target.children.push(...tabs);
  target.selected = mergeStart + selectedOffset;
};

const wrapTabInLayout = (tab: TabNode): RowNode => ({
  children: [
    {
      children: [tab],
      id: createNodeId("tabset"),
      selected: 0,
      type: "tabset",
      weight: DEFAULT_WEIGHT,
    },
  ],
  id: createNodeId("row"),
  orientation: "row",
  type: "row",
  weight: DEFAULT_WEIGHT,
});

const wrapTabsetInLayout = (tabset: TabsetNode): RowNode => ({
  children: [tabset],
  id: createNodeId("row"),
  orientation: "row",
  type: "row",
  weight: DEFAULT_WEIGHT,
});

export {
  detachTab,
  insertTab,
  mergeTabsInto,
  placeBesideTarget,
  removeTabset,
  removeTabsetReturning,
  wrapTabInLayout,
  wrapTabsetInLayout,
};
export type { DropTarget };

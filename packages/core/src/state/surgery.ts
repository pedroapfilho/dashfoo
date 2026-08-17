import { clampSelected } from "../lib/clamp-selected";
import { createNodeId } from "../model/ids";
import type { Dashfoo, Orientation, RowNode, TabNode, TabsetNode } from "../model/schema";
import { DEFAULT_WEIGHT } from "../model/schema";
import type { TabContainer } from "../model/tree";
import { findTabset, findTabsetParent } from "../model/tree";

import type { DockLocation } from "./actions";

/** The four locations that produce a split. `center` merges instead, so it is not one of them. */
type SplitLocation = Exclude<DockLocation, "center">;

const removeTabsetReturning = (model: Dashfoo, tabsetId: string): TabsetNode | undefined => {
  const found = findTabsetParent(model, tabsetId);
  if (!found) {
    return undefined;
  }
  const [removed] = found.parent.children.splice(found.index, 1);
  return removed?.type === "tabset" ? removed : undefined;
};

/**
 * Total over the split locations, so adding a sixth `DockLocation` is a compile
 * error here rather than a wrong default. Deriving it from geometry's nullable
 * `splitEdge` used to fold `center` into a silent split-bottom.
 */
const SPLIT_PLACEMENT = {
  "split-bottom": { before: false, orientation: "column" },
  "split-left": { before: true, orientation: "row" },
  "split-right": { before: false, orientation: "row" },
  "split-top": { before: true, orientation: "column" },
} as const satisfies Record<SplitLocation, { before: boolean; orientation: Orientation }>;

const placeBesideTarget = (
  draft: Dashfoo,
  placed: TabsetNode,
  targetId: string,
  location: SplitLocation,
): boolean => {
  const targetTabset = findTabset(draft, targetId);
  const found = findTabsetParent(draft, targetId);
  if (!targetTabset || !found) {
    return false;
  }

  const { before, orientation } = SPLIT_PLACEMENT[location];

  if (found.parent.orientation === orientation) {
    const half = targetTabset.weight / 2;
    targetTabset.weight = half;
    placed.weight = half;
    found.parent.children.splice(before ? found.index : found.index + 1, 0, placed);
  } else {
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
  return true;
};

type DropTarget = { id: string; index?: number; location: DockLocation };

const insertTab = (draft: Dashfoo, tab: TabNode, target: DropTarget): boolean => {
  const { id: targetId, index, location } = target;
  const targetTabset = findTabset(draft, targetId);
  if (!targetTabset) {
    return false;
  }

  if (location === "center") {
    const at = Math.min(
      Math.max(index ?? targetTabset.children.length, 0),
      targetTabset.children.length,
    );
    targetTabset.children.splice(at, 0, tab);
    targetTabset.selected = at;
    return true;
  }

  const newTabset: TabsetNode = {
    children: [tab],
    id: createNodeId("tabset"),
    selected: 0,
    type: "tabset",
    weight: DEFAULT_WEIGHT,
  };
  return placeBesideTarget(draft, newTabset, targetId, location);
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
  removeTabsetReturning,
  wrapTabInLayout,
  wrapTabsetInLayout,
};
export type { DropTarget, SplitLocation };

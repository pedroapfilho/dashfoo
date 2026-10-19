import { assertNever } from "../lib/assert-never";
import { warn } from "../lib/warn";
import { floatNode, row, tabset } from "../model/builders";
import type { Dashfoo, Geometry, RowNode, TabNode, TabsetNode } from "../model/schema";
import {
  collectTabsetsInRow,
  findAttributedNode,
  findFloat,
  findTab,
  findTabsetParent,
} from "../model/tree";

import type { Action, DockLocation } from "./actions";
import type { SplitLocation } from "./dock-placement";
import { SPLIT_PLACEMENT } from "./dock-placement";
import { uniqueFloatName } from "./floats";

type DockingAction = Extract<
  Action,
  { type: "addNode" | "dockFloat" | "floatTab" | "floatTabset" | "moveNode" | "moveTabset" }
>;

type Slot = { parent: RowNode; tabset: TabsetNode };

const DEFAULT_FLOAT_GEOMETRY: Geometry = { height: 360, left: 80, top: 80, width: 480 };

/**
 * The index, in the strip as it stands, of the tab that inherits the selection
 * when the selected tab at `removedIndex` leaves: its right neighbour, else its
 * left one. `-1` when the strip empties.
 */
const fallbackSelectedIndex = (count: number, removedIndex: number): number =>
  removedIndex + 1 < count ? removedIndex + 1 : removedIndex - 1;

const locateTabset = (draft: Dashfoo, tabsetId: string): Slot | undefined => {
  const found = findTabsetParent(draft, tabsetId);
  const node = found?.parent.children.at(found.index);
  return found && node?.type === "tabset" ? { parent: found.parent, tabset: node } : undefined;
};

const locateMainTarget = (draft: Dashfoo, targetId: string | undefined): Slot | undefined => {
  const mainTabsets: Array<TabsetNode> = [];
  collectTabsetsInRow(draft.layout, mainTabsets);
  const target =
    mainTabsets.find((candidate) => candidate.id === targetId) ??
    mainTabsets.find((candidate) => candidate.id === draft.activeTabsetId) ??
    mainTabsets.at(0);
  return target && locateTabset(draft, target.id);
};

const detachTab = (container: TabsetNode, index: number): TabNode | undefined => {
  const heir =
    index === container.selected
      ? fallbackSelectedIndex(container.children.length, index)
      : container.selected;
  const removed = container.children.splice(index, 1).at(0);
  container.selected = heir > index ? heir - 1 : heir;
  return removed;
};

const removeTab = (draft: Dashfoo, tabId: string): TabNode | undefined => {
  const location = findTab(draft, tabId);
  return location && detachTab(location.container, location.index);
};

const detachTabset = ({ parent, tabset: detached }: Slot): TabsetNode => {
  parent.children.splice(parent.children.indexOf(detached), 1);
  return detached;
};

const removeTabset = (draft: Dashfoo, tabsetId: string): void => {
  const slot = locateTabset(draft, tabsetId);
  if (slot) {
    detachTabset(slot);
  }
};

/** Located at attach time, not resolve time: detaching a sibling shifts the target's index. */
const placeBeside = (
  { parent, tabset: target }: Slot,
  placed: TabsetNode,
  location: SplitLocation,
): TabsetNode => {
  const { before, orientation } = SPLIT_PLACEMENT[location];
  const index = parent.children.indexOf(target);

  if (parent.orientation === orientation) {
    const half = target.weight / 2;
    target.weight = half;
    placed.weight = half;
    parent.children.splice(before ? index : index + 1, 0, placed);
    return placed;
  }

  const wrap = row(before ? [placed, target] : [target, placed], {
    orientation,
    weight: target.weight,
  });
  target.weight = 50;
  placed.weight = 50;
  parent.children.splice(index, 1, wrap);
  return placed;
};

const mergeTabs = (target: TabsetNode, tabs: Array<TabNode>, selected: number): TabsetNode => {
  target.selected = target.children.length + selected;
  target.children.push(...tabs);
  return target;
};

const attachTab = (
  target: Slot,
  tab: TabNode,
  location: DockLocation,
  index: number | undefined,
): TabsetNode => {
  if (location !== "center") {
    return placeBeside(target, tabset([tab]), location);
  }
  const strip = target.tabset.children;
  const at = Math.min(Math.max(index ?? strip.length, 0), strip.length);
  strip.splice(at, 0, tab);
  target.tabset.selected = at;
  return target.tabset;
};

const floatOut = (
  draft: Dashfoo,
  placed: TabsetNode,
  geometry: Geometry | undefined,
  floatId: string | undefined,
): TabsetNode => {
  const float = floatNode(row([placed]), geometry ?? DEFAULT_FLOAT_GEOMETRY, {
    id: floatId,
    name: uniqueFloatName("Panel", draft.floats),
  });
  draft.floats = [...draft.floats, float];
  return placed;
};

const isIdInUse = (draft: Dashfoo, id: string): boolean =>
  findAttributedNode(draft, id) !== undefined || findFloat(draft, id) !== undefined;

const addTab = (
  draft: Dashfoo,
  { index, location, tab, targetId }: Extract<DockingAction, { type: "addNode" }>,
): TabsetNode | undefined => {
  if (isIdInUse(draft, tab.id)) {
    warn(
      `addNode ignored: node id "${tab.id}" is already in the layout. Pass a fresh id, e.g. createTabId()`,
    );
    return undefined;
  }
  const target = locateTabset(draft, targetId);
  return target && attachTab(target, tab, location, index);
};

const moveTab = (
  draft: Dashfoo,
  { index, location, sourceId, targetId }: Extract<DockingAction, { type: "moveNode" }>,
): TabsetNode | undefined => {
  const target = locateTabset(draft, targetId);
  if (!target) {
    return undefined;
  }
  const tab = removeTab(draft, sourceId);
  return tab && attachTab(target, tab, location, index);
};

const moveTabset = (
  draft: Dashfoo,
  { location, sourceId, targetId }: Extract<DockingAction, { type: "moveTabset" }>,
): TabsetNode | undefined => {
  const target = locateTabset(draft, targetId);
  const source = sourceId === targetId ? undefined : locateTabset(draft, sourceId);
  if (!target || !source) {
    return undefined;
  }
  const moved = detachTabset(source);
  return location === "center"
    ? mergeTabs(target.tabset, moved.children, moved.selected)
    : placeBeside(target, moved, location);
};

const floatTab = (
  draft: Dashfoo,
  { floatId, geometry, tabId }: Extract<DockingAction, { type: "floatTab" }>,
): TabsetNode | undefined => {
  const tab = removeTab(draft, tabId);
  return tab && floatOut(draft, tabset([tab]), geometry, floatId);
};

const floatTabset = (
  draft: Dashfoo,
  { floatId, geometry, tabsetId }: Extract<DockingAction, { type: "floatTabset" }>,
): TabsetNode | undefined => {
  const source = locateTabset(draft, tabsetId);
  return source && floatOut(draft, detachTabset(source), geometry, floatId);
};

/** A float holding one tabset docks as that tabset, keeping its id; several are flattened into one strip. */
const dockFloat = (
  draft: Dashfoo,
  { floatId, location, targetId }: Extract<DockingAction, { type: "dockFloat" }>,
): TabsetNode | undefined => {
  const float = findFloat(draft, floatId);
  if (!float) {
    return undefined;
  }
  const floatTabsets: Array<TabsetNode> = [];
  collectTabsetsInRow(float.layout, floatTabsets);
  const filled = floatTabsets.filter((candidate) => candidate.children.length > 0);
  const lead = filled.at(0);
  if (!lead) {
    return undefined;
  }

  const target = locateMainTarget(draft, targetId);
  draft.floats = draft.floats.filter((other) => other !== float);
  if (!target) {
    draft.layout = float.layout;
    return lead;
  }

  const tabs = filled.flatMap((candidate) => candidate.children);
  if (location === "center") {
    return mergeTabs(target.tabset, tabs, lead.selected);
  }
  const placed = filled.length === 1 ? lead : tabset(tabs, { selected: lead.selected });
  return placeBeside(target, placed, location ?? "split-right");
};

const transact = (draft: Dashfoo, action: DockingAction): TabsetNode | undefined => {
  switch (action.type) {
    case "addNode": {
      return addTab(draft, action);
    }
    case "dockFloat": {
      return dockFloat(draft, action);
    }
    case "floatTab": {
      return floatTab(draft, action);
    }
    case "floatTabset": {
      return floatTabset(draft, action);
    }
    case "moveNode": {
      return moveTab(draft, action);
    }
    case "moveTabset": {
      return moveTabset(draft, action);
    }
    default: {
      return assertNever(action);
    }
  }
};

/**
 * Every transaction resolves its target before it detaches anything, so a drop
 * that cannot land loses nothing. Each returns the tabset that received the
 * moved content, and that tabset takes focus whatever the drop kind.
 */
const dock = (draft: Dashfoo, action: DockingAction): void => {
  const receiver = transact(draft, action);
  if (receiver) {
    draft.activeTabsetId = receiver.id;
  }
};

export { dock, fallbackSelectedIndex, removeTab, removeTabset };

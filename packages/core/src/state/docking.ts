import { assertNever } from "../lib/assert-never";
import { warn } from "../lib/warn";
import { floatNode, row, tabset } from "../model/builders";
import type { DockLocation, SplitLocation } from "../model/dock-location";
import { SPLIT_PLACEMENT } from "../model/dock-location";
import { createNodeId } from "../model/ids";
import type { Dashfoo, Geometry, TabNode, TabsetNode } from "../model/schema";
import { DEFAULT_FLOAT_GEOMETRY, DEFAULT_FLOAT_NAME } from "../model/schema";
import type { TabsetSlot } from "../model/tree";
import {
  collectTabsetsInRow,
  findAttributedNode,
  findFloat,
  findTab,
  findTabsetParent,
} from "../model/tree";

import type { Action } from "./actions";
import { uniqueFloatName } from "./floats";

type DockingAction = Extract<
  Action,
  {
    type:
      | "addNode"
      | "dockFloat"
      | "floatTab"
      | "floatTabset"
      | "moveNode"
      | "moveTabset"
      | "transferIn";
  }
>;

/**
 * The index, in the strip as it stands, of the tab that inherits the selection
 * when the selected tab at `removedIndex` leaves: its right neighbour, else its
 * left one. `-1` when the strip empties.
 */
const fallbackSelectedIndex = (count: number, removedIndex: number): number =>
  removedIndex + 1 < count ? removedIndex + 1 : removedIndex - 1;

/** An explicit target must exist; without one, the active main tabset, else the first. */
const locateMainTarget = (
  draft: Dashfoo,
  mainTabsets: Array<TabsetNode>,
  targetId: string | undefined,
): TabsetSlot | undefined => {
  const target =
    targetId === undefined
      ? (mainTabsets.find((candidate) => candidate.id === draft.activeTabsetId) ??
        mainTabsets.at(0))
      : mainTabsets.find((candidate) => candidate.id === targetId);

  return target && findTabsetParent(draft, target.id);
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

const detachTabset = ({ parent, tabset: detached }: TabsetSlot): TabsetNode => {
  parent.children.splice(parent.children.indexOf(detached), 1);

  return detached;
};

const removeTabset = (draft: Dashfoo, tabsetId: string): void => {
  const slot = findTabsetParent(draft, tabsetId);

  if (slot) {
    detachTabset(slot);
  }
};

/** A tab or a whole tabset, wherever it lives. */
const removeNode = (draft: Dashfoo, nodeId: string): void => {
  if (findTab(draft, nodeId)) {
    removeTab(draft, nodeId);
  } else {
    removeTabset(draft, nodeId);
  }
};

/** Located at attach time, not resolve time: detaching a sibling shifts the target's index. */
const placeBeside = (
  { parent, tabset: target }: TabsetSlot,
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
  target: TabsetSlot,
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
    name: uniqueFloatName(DEFAULT_FLOAT_NAME, draft.floats),
  });

  draft.floats = [...draft.floats, float];

  return placed;
};

const isIdInUse = (draft: Dashfoo, id: string): boolean =>
  findAttributedNode(draft, id) !== undefined || findFloat(draft, id) !== undefined;

const canCreateFloat = (draft: Dashfoo, floatId: string | undefined): boolean => {
  if (floatId === undefined || !isIdInUse(draft, floatId)) {
    return true;
  }

  warn(`float ignored: float id "${floatId}" is already in the layout. Pass a fresh id`);

  return false;
};

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

  const target = findTabsetParent(draft, targetId);

  return target && attachTab(target, tab, location, index);
};

const moveTab = (
  draft: Dashfoo,
  { index, location, sourceId, targetId }: Extract<DockingAction, { type: "moveNode" }>,
): TabsetNode | undefined => {
  const target = findTabsetParent(draft, targetId);
  const source = findTab(draft, sourceId);

  if (!target || !source) {
    return undefined;
  }

  // Splitting a strip off its own only tab would land the tab back in a fresh, half-sized slot.
  if (
    location !== "center" &&
    source.container === target.tabset &&
    source.container.children.length === 1
  ) {
    return undefined;
  }

  const tab = detachTab(source.container, source.index);

  return tab && attachTab(target, tab, location, index);
};

const moveTabset = (
  draft: Dashfoo,
  { location, sourceId, targetId }: Extract<DockingAction, { type: "moveTabset" }>,
): TabsetNode | undefined => {
  const target = findTabsetParent(draft, targetId);
  const source = sourceId === targetId ? undefined : findTabsetParent(draft, sourceId);

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
  const tab = canCreateFloat(draft, floatId) ? removeTab(draft, tabId) : undefined;

  return tab && floatOut(draft, tabset([tab]), geometry, floatId);
};

const floatTabset = (
  draft: Dashfoo,
  { floatId, geometry, tabsetId }: Extract<DockingAction, { type: "floatTabset" }>,
): TabsetNode | undefined => {
  const source = canCreateFloat(draft, floatId) ? findTabsetParent(draft, tabsetId) : undefined;

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

  const filled = collectTabsetsInRow(float.layout).filter(
    (candidate) => candidate.children.length > 0,
  );

  const lead = filled.at(0);

  if (!lead) {
    return undefined;
  }

  const mainTabsets = collectTabsetsInRow(draft.layout);

  if (mainTabsets.length === 0 && targetId === undefined) {
    draft.floats = draft.floats.filter((other) => other !== float);
    draft.layout = float.layout;

    return lead;
  }

  const target = locateMainTarget(draft, mainTabsets, targetId);

  if (!target) {
    return undefined;
  }

  draft.floats = draft.floats.filter((other) => other !== float);

  const tabs = filled.flatMap((candidate) => candidate.children);

  if (location === "center") {
    return mergeTabs(target.tabset, tabs, lead.selected);
  }

  const placed = filled.length === 1 ? lead : tabset(tabs, { selected: lead.selected });

  return placeBeside(target, placed, location ?? "split-right");
};

/**
 * Tab ids travel with the node, so one already in this layout rejects the whole
 * drop. A tabset id only names its slot, so a taken one is replaced.
 */
const transferIn = (
  draft: Dashfoo,
  { index, location, node, targetId }: Extract<DockingAction, { type: "transferIn" }>,
): TabsetNode | undefined => {
  const tabs = node.type === "tab" ? [node] : node.children;
  const taken = tabs.find((candidate) => isIdInUse(draft, candidate.id));

  if (taken) {
    warn(`transferIn ignored: tab id "${taken.id}" is already in the layout`);

    return undefined;
  }

  const target = findTabsetParent(draft, targetId);

  if (!target) {
    return undefined;
  }

  if (node.type === "tab") {
    return attachTab(target, node, location, index);
  }

  if (location === "center") {
    return mergeTabs(target.tabset, node.children, node.selected);
  }

  const placed = isIdInUse(draft, node.id) ? { ...node, id: createNodeId("tabset") } : node;

  return placeBeside(target, placed, location);
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

    case "transferIn": {
      return transferIn(draft, action);
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

export { dock, fallbackSelectedIndex, removeNode, removeTab, removeTabset };

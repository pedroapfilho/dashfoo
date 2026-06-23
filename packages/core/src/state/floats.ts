import { createNodeId } from "../model/ids";
import type { Dashfoo, FloatNode, Geometry, RowNode, TabsetNode } from "../model/schema";
import { findRootContaining } from "../model/tree";

import type { DockLocation } from "./actions";
import {
  placeBesideTarget,
  removeTabsetReturning,
  tabsetsInRow,
  wrapTabsetInLayout,
} from "./surgery";

// Float operations: floating a tabset out, docking it back, and naming. Floats are
// a second set of roots, so these lean on the same surgery helpers as the main
// layout. Split out of the reducer to keep each file focused (and under the cap).

// Default float rect when the caller doesn't measure the source (e.g. a
// programmatic float). The React layer normally supplies a rect over the panel.
const DEFAULT_FLOAT_GEOMETRY: Geometry = { height: 360, left: 80, top: 80, width: 480 };

// A unique window name: `base` if free among the floats, else `base 1`, `base 2`, …
// Floats are auto-named "Panel" and renames are deduped through this, so two floats
// never share a title.
const uniqueFloatName = (base: string, floats: Array<FloatNode>): string => {
  const used = new Set(floats.map((float) => float.name));
  if (!used.has(base)) {
    return base;
  }
  let index = 1;
  while (used.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
};

// Append a new floating panel holding `layout`, and move focus to its first tabset
// so active-tabset/keyboard logic tracks the floated panel. `floatId` is supplied
// when the caller minted the id up front, so the model node and any UI agree.
const pushFloat = (
  draft: Dashfoo,
  layout: RowNode,
  geometry: Geometry | undefined,
  floatId: string | undefined,
): void => {
  const float: FloatNode = {
    geometry: geometry ?? DEFAULT_FLOAT_GEOMETRY,
    id: floatId ?? createNodeId("float"),
    layout,
    name: uniqueFloatName("Panel", draft.floats ?? []),
    type: "float",
  };
  draft.floats = [...(draft.floats ?? []), float];

  const tabsets: Array<TabsetNode> = [];
  tabsetsInRow(layout, tabsets);
  const first = tabsets[0];
  if (first) {
    draft.activeTabsetId = first.id;
  }
};

const floatTabsetById = (
  draft: Dashfoo,
  tabsetId: string,
  geometry: Geometry | undefined,
  floatId: string | undefined,
): void => {
  const root = findRootContaining(draft, tabsetId);
  if (!root) {
    return;
  }
  const detached = removeTabsetReturning(root, tabsetId);
  if (detached) {
    pushFloat(draft, wrapTabsetInLayout(detached), geometry, floatId);
  }
};

// Dock-back targets the MAIN layout only (never another float): prefer an explicit
// target, then the active tabset, then the first main tabset.
const resolveMainTarget = (
  draft: Dashfoo,
  targetId: string | undefined,
): TabsetNode | undefined => {
  const mainTabsets: Array<TabsetNode> = [];
  tabsetsInRow(draft.layout, mainTabsets);
  if (targetId) {
    const explicit = mainTabsets.find((tabset) => tabset.id === targetId);
    if (explicit) {
      return explicit;
    }
  }
  if (draft.activeTabsetId !== undefined) {
    const active = mainTabsets.find((tabset) => tabset.id === draft.activeTabsetId);
    if (active) {
      return active;
    }
  }
  return mainTabsets[0];
};

const dockFloat = (
  draft: Dashfoo,
  floatId: string,
  targetId: string | undefined,
  location: DockLocation | undefined,
): void => {
  const floats = draft.floats ?? [];
  const index = floats.findIndex((float) => float.id === floatId);
  if (index === -1) {
    return;
  }
  const [float] = floats.splice(index, 1);
  draft.floats = floats;
  if (!float) {
    return;
  }

  const tabsets: Array<TabsetNode> = [];
  tabsetsInRow(float.layout, tabsets);
  const tabs = tabsets.flatMap((tabset) => tabset.children);
  if (tabs.length === 0) {
    return;
  }

  // Carry over which tab the user had selected in the float. The float's first
  // tabset leads the flattened list (the common single-tabset float), so its
  // clamped `selected` is the offset of the focused tab — clamp against the
  // tabset's own length, like the moveTabset center merge, so a stale index can't
  // resolve to the wrong tab.
  const leadTabset = tabsets[0];
  const selectedOffset = leadTabset
    ? Math.min(Math.max(leadTabset.selected, 0), leadTabset.children.length - 1)
    : 0;

  const target = resolveMainTarget(draft, targetId);
  if (!target) {
    // Nothing left in the main layout to dock into — promote the float's own layout
    // to be the main layout so its tabs aren't lost.
    draft.layout = float.layout;
    draft.activeTabsetId = leadTabset?.id;
    return;
  }

  // An explicit `center` (e.g. a drag dropped onto a tab strip) merges the float's
  // tabs into the target. The default dock-back, though, restores the float as its
  // OWN panel beside the target — bringing all its tabs back as a group rather than
  // flattening them into another tabset.
  if (location === "center") {
    const mergeStart = target.children.length;
    target.children.push(...tabs);
    target.selected = mergeStart + selectedOffset;
    draft.activeTabsetId = target.id;
    return;
  }

  const where = location ?? "split-right";
  // A single-tabset float (the common case) re-docks that exact tabset, preserving
  // its id, tabs, and selected index; a split float collapses to one new tabset.
  const placed: TabsetNode =
    tabsets.length === 1 && leadTabset
      ? leadTabset
      : { children: tabs, id: createNodeId("tabset"), selected: selectedOffset, type: "tabset" };
  placed.weight = 50;
  placeBesideTarget(draft, placed, target.id, where);
};

export { dockFloat, floatTabsetById, pushFloat, uniqueFloatName };

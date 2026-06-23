import { createNodeId } from "../model/ids";
import { normalize } from "../model/invariants";
import type { Dashfoo, FloatNode, Geometry, RowNode, TabNode, TabsetNode } from "../model/schema";
import {
  findAttributedNode,
  findFloat,
  findRootContaining,
  findRow,
  findTab,
  findTabset,
  findTabsetParent,
} from "../model/tree";

import type { Action, DockLocation } from "./actions";

// Default float rect when the caller doesn't measure the source (e.g. a
// programmatic float). The React layer normally supplies a rect over the panel.
const DEFAULT_FLOAT_GEOMETRY: Geometry = { height: 360, left: 80, top: 80, width: 480 };

const assertNever = (value: never): never => {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`);
};

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

// Detach a tabset from the tree and return it (for moving a whole tabset).
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

// Place an (already-detached) tabset beside the target for a split-* location:
// reuse the parent row when the orientation already matches, else wrap the target
// in a new row. Shared by insertTab (a fresh tabset) and moveTabset (an existing
// one). Splits the target's space in half.
const placeBesideTarget = (
  draft: Dashfoo,
  placed: TabsetNode,
  targetId: string,
  location: DockLocation,
): void => {
  const targetTabset = findTabset(draft, targetId);
  // Operate within whichever root holds the target (main layout or a window),
  // so a split docked inside a popped-out window stays in that window.
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

// Insert a tab into the model at a dock target. center stacks it into the target
// tabset; split-* creates a new tabset beside the target.
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

const tabsetsInRow = (row: RowNode, acc: Array<TabsetNode>): void => {
  for (const child of row.children) {
    if (child.type === "tabset") {
      acc.push(child);
    } else {
      tabsetsInRow(child, acc);
    }
  }
};

// Wrap a detached node in the row → tabset scaffolding a window's layout needs.
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

// Append a new floating panel holding `layout`, and move focus to its first
// tabset so active-tabset/keyboard logic tracks the floated panel. `floatId` is
// supplied when the caller minted the id up front, so the model node and any UI
// tracking it agree.
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

// Dock-back targets the MAIN layout only (never another float): prefer an
// explicit target, then the active tabset, then the first main tabset.
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
    // Nothing left in the main layout to dock into — promote the float's own
    // layout to be the main layout so its tabs aren't lost.
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

const applyAction = (draft: Dashfoo, action: Action): void => {
  switch (action.type) {
    case "addNode": {
      insertTab(draft, action.tab, {
        id: action.targetId,
        index: action.index,
        location: action.location,
      });
      return;
    }
    case "adjustSplit": {
      const root = findRootContaining(draft, action.rowId) ?? draft.layout;
      const row = findRow(root, action.rowId);
      if (!row) {
        return;
      }
      for (let index = 0; index < action.weights.length; index++) {
        const child = row.children[index];
        const weight = action.weights[index];
        if (!child || weight === undefined) {
          continue;
        }
        child.weight = weight;
      }
      return;
    }
    case "deleteTab": {
      const location = findTab(draft, action.tabId);
      if (location) {
        location.container.children.splice(location.index, 1);
      }
      return;
    }
    case "deleteTabset": {
      const root = findRootContaining(draft, action.tabsetId);
      if (root) {
        removeTabset(root, action.tabsetId);
      }
      return;
    }
    case "floatTab": {
      const location = findTab(draft, action.tabId);
      if (!location) {
        return;
      }
      const [removed] = location.container.children.splice(location.index, 1);
      if (removed) {
        pushFloat(draft, wrapTabInLayout(removed), action.geometry, action.floatId);
      }
      return;
    }
    case "floatTabset": {
      floatTabsetById(draft, action.tabsetId, action.geometry, action.floatId);
      return;
    }
    case "moveNode": {
      const source = findTab(draft, action.sourceId);
      if (!source) {
        return;
      }
      // Remove the source first; action.index is the destination slot measured
      // against the tabs that remain (the drag adapter excludes the dragged tab),
      // so it indexes the post-removal array directly — no reorder adjustment.
      const [removed] = source.container.children.splice(source.index, 1);
      if (!removed) {
        return;
      }
      insertTab(draft, removed, {
        id: action.targetId,
        index: action.index,
        location: action.location,
      });
      return;
    }
    case "moveTabset": {
      if (action.sourceId === action.targetId) {
        return;
      }
      const source = findTabset(draft, action.sourceId);
      if (!source) {
        return;
      }
      if (action.location === "center") {
        const target = findTabset(draft, action.targetId);
        if (target) {
          const mergeStart = target.children.length;
          // Clamp the source's selection against the SOURCE's own tab count before
          // offsetting. normalize's clampSelected only bounds against the FINAL
          // merged length, so a stale/out-of-range source.selected would otherwise
          // resolve to a valid-but-wrong merged index (an original target tab, or
          // the wrong source tab) that normalize cannot catch. Clamp here so the
          // merged selection always lands on a tab that came from the source.
          const sourceSelected = Math.min(Math.max(source.selected, 0), source.children.length - 1);
          target.children.push(...source.children);
          target.selected = mergeStart + sourceSelected;
          const sourceRoot = findRootContaining(draft, action.sourceId);
          if (sourceRoot) {
            removeTabset(sourceRoot, action.sourceId);
          }
        }
        return;
      }
      // split-* moves the whole tabset beside the target.
      if (action.location.startsWith("split-")) {
        const sourceRoot = findRootContaining(draft, action.sourceId);
        const detached = sourceRoot
          ? removeTabsetReturning(sourceRoot, action.sourceId)
          : undefined;
        if (detached) {
          placeBesideTarget(draft, detached, action.targetId, action.location);
        }
      }
      return;
    }
    case "dockFloat": {
      dockFloat(draft, action.floatId, action.targetId, action.location);
      return;
    }
    case "renameTab": {
      const location = findTab(draft, action.tabId);
      if (location) {
        location.tab.name = action.name;
      }
      return;
    }
    case "selectTab": {
      const tabset = findTabset(draft, action.tabsetId);
      if (tabset) {
        tabset.selected = action.index;
      }
      return;
    }
    case "setActiveTabset": {
      if (findTabset(draft, action.tabsetId)) {
        draft.activeTabsetId = action.tabsetId;
      }
      return;
    }
    case "setMaximizedTabset": {
      draft.maximizedTabsetId = action.tabsetId ?? undefined;
      return;
    }
    case "updateGlobalAttributes": {
      Object.assign(draft.global, action.attrs);
      return;
    }
    case "updateNodeAttributes": {
      const node = findAttributedNode(draft, action.nodeId);
      if (node) {
        Object.assign(node, action.attrs);
      }
      return;
    }
    case "moveFloat": {
      const float = findFloat(draft, action.floatId);
      if (float) {
        float.geometry = action.geometry;
      }
      return;
    }
    case "setFloatMinimized": {
      const float = findFloat(draft, action.floatId);
      if (float) {
        float.minimized = action.minimized;
      }
      return;
    }
    default: {
      assertNever(action);
    }
  }
};

// The canonical engine: deep-copy the model (so the input is never mutated),
// apply one action to the copy, then run the self-healing invariants so the
// result is always a valid, canonical model.
const reducer = (model: Dashfoo, action: Action): Dashfoo => {
  const draft = structuredClone(model);
  applyAction(draft, action);
  return normalize(draft);
};

export { reducer };

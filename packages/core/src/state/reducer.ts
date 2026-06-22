import { createNodeId } from "../model/ids";
import { normalize } from "../model/invariants";
import type { Dashfoo, Geometry, RowNode, TabNode, TabsetNode, WindowNode } from "../model/schema";
import {
  findAttributedNode,
  findRootContaining,
  findRow,
  findTab,
  findTabset,
  findTabsetParent,
  findWindow,
} from "../model/tree";

import type { Action, DockLocation } from "./actions";

// Default popup rect when the caller doesn't measure the source (e.g. a
// programmatic detach). The React adapter normally supplies the tab's on-screen
// rect so the window opens where the panel was.
const DEFAULT_WINDOW_GEOMETRY: Geometry = { height: 600, left: 120, top: 120, width: 800 };

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

// Append a new detached window holding `layout`, and move focus to its first
// tabset so active-tabset/keyboard logic tracks the popped-out panel. `windowId`
// is supplied when the React adapter pre-opened the browser window in the click
// gesture, so the model node and the live window agree on one id.
const pushWindow = (
  draft: Dashfoo,
  layout: RowNode,
  geometry: Geometry | undefined,
  windowId: string | undefined,
): void => {
  const window: WindowNode = {
    geometry: geometry ?? DEFAULT_WINDOW_GEOMETRY,
    id: windowId ?? createNodeId("window"),
    layout,
    type: "window",
  };
  draft.windows = [...(draft.windows ?? []), window];

  const tabsets: Array<TabsetNode> = [];
  tabsetsInRow(layout, tabsets);
  const first = tabsets[0];
  if (first) {
    draft.activeTabsetId = first.id;
  }
};

const detachTabsetById = (
  draft: Dashfoo,
  tabsetId: string,
  geometry: Geometry | undefined,
  windowId: string | undefined,
): void => {
  const root = findRootContaining(draft, tabsetId);
  if (!root) {
    return;
  }
  const detached = removeTabsetReturning(root, tabsetId);
  if (detached) {
    pushWindow(draft, wrapTabsetInLayout(detached), geometry, windowId);
  }
};

// Reattach docks back into the MAIN layout only (never another window): prefer
// an explicit target, then the active tabset, then the first main tabset.
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

const reattachWindow = (
  draft: Dashfoo,
  windowId: string,
  targetId: string | undefined,
  location: DockLocation | undefined,
): void => {
  const windows = draft.windows ?? [];
  const index = windows.findIndex((window) => window.id === windowId);
  if (index === -1) {
    return;
  }
  const [window] = windows.splice(index, 1);
  draft.windows = windows;
  if (!window) {
    return;
  }

  const tabsets: Array<TabsetNode> = [];
  tabsetsInRow(window.layout, tabsets);
  const tabs = tabsets.flatMap((tabset) => tabset.children);
  if (tabs.length === 0) {
    return;
  }

  const target = resolveMainTarget(draft, targetId);
  if (!target) {
    // Nothing left in the main layout to dock into — promote the window's own
    // layout to be the main layout so its tabs aren't lost.
    draft.layout = window.layout;
    draft.activeTabsetId = tabsets[0]?.id;
    return;
  }

  const where = location ?? "center";
  if (where === "center") {
    const mergeStart = target.children.length;
    target.children.push(...tabs);
    target.selected = mergeStart;
    draft.activeTabsetId = target.id;
    return;
  }

  const placed: TabsetNode = {
    children: tabs,
    id: createNodeId("tabset"),
    selected: 0,
    type: "tabset",
    weight: 50,
  };
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
    case "detachTab": {
      const location = findTab(draft, action.tabId);
      if (!location) {
        return;
      }
      const [removed] = location.container.children.splice(location.index, 1);
      if (removed) {
        pushWindow(draft, wrapTabInLayout(removed), action.geometry, action.windowId);
      }
      return;
    }
    case "detachTabset": {
      detachTabsetById(draft, action.tabsetId, action.geometry, action.windowId);
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
    case "reattachWindow": {
      reattachWindow(draft, action.windowId, action.targetId, action.location);
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
    case "updateWindowGeometry": {
      const window = findWindow(draft, action.windowId);
      if (window) {
        window.geometry = action.geometry;
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

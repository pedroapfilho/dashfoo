import { normalize } from "../model/invariants";
import type { Dashfoo } from "../model/schema";
import {
  findAttributedNode,
  findFloat,
  findRootContaining,
  findRow,
  findTab,
  findTabset,
} from "../model/tree";

import type { Action } from "./actions";
import { dockFloat, floatTabsetById, pushFloat, uniqueFloatName } from "./floats";
import {
  insertTab,
  placeBesideTarget,
  removeTabset,
  removeTabsetReturning,
  wrapTabInLayout,
} from "./surgery";

const assertNever = (value: never): never => {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`);
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
    case "dockFloat": {
      dockFloat(draft, action.floatId, action.targetId, action.location);
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
    case "moveFloat": {
      const float = findFloat(draft, action.floatId);
      if (float) {
        float.geometry = action.geometry;
      }
      return;
    }
    case "moveNode": {
      const source = findTab(draft, action.sourceId);
      if (!source) {
        return;
      }

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
    case "renameFloat": {
      const float = findFloat(draft, action.floatId);
      if (float) {
        const others = (draft.floats ?? []).filter((other) => other.id !== action.floatId);
        float.name = uniqueFloatName(action.name, others);
      }
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
    case "setFloatMinimized": {
      const float = findFloat(draft, action.floatId);
      if (float) {
        float.minimized = action.minimized;
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
    default: {
      assertNever(action);
    }
  }
};

const reducer = (model: Dashfoo, action: Action): Dashfoo => {
  const draft = structuredClone(model);
  applyAction(draft, action);
  return normalize(draft);
};

export { reducer };

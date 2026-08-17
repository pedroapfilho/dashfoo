import { assertNever } from "../lib/assert-never";
import { clampSelected } from "../lib/clamp-selected";
import { normalize } from "../model/invariants";
import type { Dashfoo, Geometry, GlobalAttributes } from "../model/schema";
import type { AttributedNode } from "../model/tree";
import { findAttributedNode, findFloat, findRow, findTab, findTabset } from "../model/tree";

import type { Action, MutableNodeAttrs } from "./actions";
import { dockFloat, floatTabsetById, pushFloat, uniqueFloatName } from "./floats";
import {
  mutableRowAttrsSchema,
  mutableTabAttrsSchema,
  mutableTabsetAttrsSchema,
} from "./node-attrs";
import {
  detachTab,
  insertTab,
  mergeTabsInto,
  placeBesideTarget,
  removeTabsetReturning,
  wrapTabInLayout,
} from "./surgery";

const parseNodeAttrs = (node: AttributedNode, attrs: MutableNodeAttrs): MutableNodeAttrs => {
  switch (node.type) {
    case "row": {
      return mutableRowAttrsSchema.parse(attrs);
    }
    case "tab": {
      return mutableTabAttrsSchema.parse(attrs);
    }
    case "tabset": {
      const parsed = mutableTabsetAttrsSchema.parse(attrs);
      return parsed.selected === undefined
        ? parsed
        : { ...parsed, selected: clampSelected(node.children.length, parsed.selected) };
    }
    default: {
      return assertNever(node);
    }
  }
};

const sameGeometry = (a: Geometry, b: Geometry): boolean =>
  a.height === b.height && a.left === b.left && a.top === b.top && a.width === b.width;

const alreadyApplied = (
  target: AttributedNode | GlobalAttributes,
  attrs: MutableNodeAttrs | Partial<GlobalAttributes>,
): boolean => {
  const current = new Map<string, unknown>(Object.entries(target));
  return Object.entries(attrs).every(([key, value]) => Object.is(current.get(key), value));
};

/** Reports whether it changed anything, so `history.dispatch` can skip a no-op. */
const applyAction = (draft: Dashfoo, action: Action): boolean => {
  switch (action.type) {
    case "addNode": {
      return insertTab(draft, action.tab, {
        id: action.targetId,
        index: action.index,
        location: action.location,
      });
    }
    case "adjustSplit": {
      const row = findRow(draft, action.rowId);
      if (!row) {
        return false;
      }
      let changed = false;
      for (let index = 0; index < action.weights.length; index++) {
        const child = row.children.at(index);
        const weight = action.weights[index];
        if (!child || weight === undefined || child.weight === weight) {
          continue;
        }
        child.weight = weight;
        changed = true;
      }
      return changed;
    }
    case "deleteTab": {
      const location = findTab(draft, action.tabId);
      if (!location) {
        return false;
      }
      detachTab(location.container, location.index);
      return true;
    }
    case "deleteTabset": {
      return removeTabsetReturning(draft, action.tabsetId) !== undefined;
    }
    case "dockFloat": {
      return dockFloat(draft, action.floatId, action.targetId, action.location);
    }
    case "floatTab": {
      const location = findTab(draft, action.tabId);
      if (!location) {
        return false;
      }
      const removed = detachTab(location.container, location.index);
      if (!removed) {
        return false;
      }
      pushFloat(draft, wrapTabInLayout(removed), action.geometry, action.floatId);
      return true;
    }
    case "floatTabset": {
      return floatTabsetById(draft, action.tabsetId, action.geometry, action.floatId);
    }
    case "moveFloat": {
      const float = findFloat(draft, action.floatId);
      if (!float || sameGeometry(float.geometry, action.geometry)) {
        return false;
      }
      float.geometry = action.geometry;
      return true;
    }
    case "moveNode": {
      const source = findTab(draft, action.sourceId);
      // Resolved before the tab leaves its container: nothing else holds it.
      if (!source || !findTabset(draft, action.targetId)) {
        return false;
      }

      const removed = detachTab(source.container, source.index);
      if (!removed) {
        return false;
      }
      return insertTab(draft, removed, {
        id: action.targetId,
        index: action.index,
        location: action.location,
      });
    }
    case "moveTabset": {
      if (action.sourceId === action.targetId) {
        return false;
      }
      const source = findTabset(draft, action.sourceId);
      const target = findTabset(draft, action.targetId);
      if (!source || !target) {
        return false;
      }
      if (action.location === "center") {
        mergeTabsInto(
          target,
          source.children,
          clampSelected(source.children.length, source.selected),
        );
        removeTabsetReturning(draft, action.sourceId);
        return true;
      }

      const detached = removeTabsetReturning(draft, action.sourceId);
      return detached
        ? placeBesideTarget(draft, detached, action.targetId, action.location)
        : false;
    }
    case "renameFloat": {
      const float = findFloat(draft, action.floatId);
      if (!float) {
        return false;
      }
      const others = draft.floats.filter((other) => other.id !== action.floatId);
      const name = uniqueFloatName(action.name, others);
      if (float.name === name) {
        return false;
      }
      float.name = name;
      return true;
    }
    case "renameTab": {
      const location = findTab(draft, action.tabId);
      if (!location || location.tab.name === action.name) {
        return false;
      }
      location.tab.name = action.name;
      return true;
    }
    case "selectTab": {
      const tabset = findTabset(draft, action.tabsetId);
      if (!tabset) {
        return false;
      }
      const selected = clampSelected(tabset.children.length, action.index);
      if (tabset.selected === selected) {
        return false;
      }
      tabset.selected = selected;
      return true;
    }
    case "setActiveTabset": {
      if (draft.activeTabsetId === action.tabsetId || !findTabset(draft, action.tabsetId)) {
        return false;
      }
      draft.activeTabsetId = action.tabsetId;
      return true;
    }
    case "setFloatMinimized": {
      const float = findFloat(draft, action.floatId);
      if (!float || (float.minimized ?? false) === action.minimized) {
        return false;
      }
      float.minimized = action.minimized;
      return true;
    }
    case "setMaximizedTabset": {
      const next = action.tabsetId ?? undefined;
      if (draft.maximizedTabsetId === next) {
        return false;
      }
      draft.maximizedTabsetId = next;
      return true;
    }
    case "updateGlobalAttributes": {
      if (alreadyApplied(draft.global, action.attrs)) {
        return false;
      }
      Object.assign(draft.global, action.attrs);
      return true;
    }
    case "updateNodeAttributes": {
      const node = findAttributedNode(draft, action.nodeId);
      if (!node) {
        return false;
      }
      const parsed = parseNodeAttrs(node, action.attrs);
      if (alreadyApplied(node, parsed)) {
        return false;
      }
      Object.assign(node, parsed);
      return true;
    }
    default: {
      return assertNever(action);
    }
  }
};

/** Identity-equal output means "no edit". A rejected action skips `normalize`, so
 * pass a model that has already been through it. */
const reducer = (model: Dashfoo, action: Action): Dashfoo => {
  const draft = structuredClone(model);
  if (!applyAction(draft, action)) {
    return model;
  }
  return normalize(draft);
};

export { reducer };

import { assertNever } from "../lib/assert-never";
import { normalize } from "../model/invariants";
import type { Dashfoo } from "../model/schema";
import type { AttributedNode } from "../model/tree";
import { findAttributedNode, findFloat, findRow, findTab, findTabset } from "../model/tree";

import type { Action, MutableNodeAttrs } from "./actions";
import { dockFloat, floatTabsetById, pushFloat, uniqueFloatName } from "./floats";
import { jsonEqual } from "./json-equal";
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
      return mutableTabsetAttrsSchema.parse(attrs);
    }
    default: {
      return assertNever(node);
    }
  }
};

/** An id that does not resolve leaves the draft untouched. */
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
      const row = findRow(draft, action.rowId);
      if (!row) {
        return;
      }
      for (const [index, child] of row.children.entries()) {
        const weight = action.weights.at(index);
        if (weight !== undefined) {
          child.weight = weight;
        }
      }
      return;
    }
    case "deleteTab": {
      const location = findTab(draft, action.tabId);
      if (location) {
        detachTab(location.container, location.index);
      }
      return;
    }
    case "deleteTabset": {
      removeTabsetReturning(draft, action.tabsetId);
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
      const removed = detachTab(location.container, location.index);
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
      // Resolved before the tab leaves its container: nothing else holds it.
      if (!source || !findTabset(draft, action.targetId)) {
        return;
      }

      const removed = detachTab(source.container, source.index);
      if (removed) {
        insertTab(draft, removed, {
          id: action.targetId,
          index: action.index,
          location: action.location,
        });
      }
      return;
    }
    case "moveTabset": {
      if (action.sourceId === action.targetId) {
        return;
      }
      const source = findTabset(draft, action.sourceId);
      const target = findTabset(draft, action.targetId);
      if (!source || !target) {
        return;
      }
      if (action.location === "center") {
        mergeTabsInto(target, source.children, source.selected);
        removeTabsetReturning(draft, action.sourceId);
        return;
      }

      const detached = removeTabsetReturning(draft, action.sourceId);
      if (detached) {
        placeBesideTarget(draft, detached, action.targetId, action.location);
      }
      return;
    }
    case "renameFloat": {
      const float = findFloat(draft, action.floatId);
      if (float) {
        const others = draft.floats.filter((other) => other.id !== action.floatId);
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
      if (action.tabsetId === null) {
        draft.maximizedTabsetId = undefined;
      } else if (findTabset(draft, action.tabsetId)) {
        draft.maximizedTabsetId = action.tabsetId;
      }
      return;
    }
    case "updateGlobalAttributes": {
      Object.assign(draft.global, action.attrs);
      return;
    }
    case "updateNodeAttributes": {
      const node = findAttributedNode(draft, action.nodeId);
      if (node) {
        Object.assign(node, parseNodeAttrs(node, action.attrs));
      }
      return;
    }
    default: {
      assertNever(action);
    }
  }
};

/**
 * Returns `model` itself when the action changed nothing, so `history.dispatch`
 * can tell a no-op from an edit by identity. The comparison runs after
 * `normalize`, because only `normalize` knows which edits it will undo.
 */
const reducer = (model: Dashfoo, action: Action): Dashfoo => {
  const draft = structuredClone(model);
  applyAction(draft, action);
  const next = normalize(draft);
  return jsonEqual(next, model) ? model : next;
};

export { reducer };

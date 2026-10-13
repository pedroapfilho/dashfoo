import { assertNever } from "../lib/assert-never";
import { normalize } from "../model/invariants";
import type { Dashfoo } from "../model/schema";
import type { AttributedNode } from "../model/tree";
import { findAttributedNode, findFloat, findRow, findTab, findTabset } from "../model/tree";

import type { Action, MutableNodeAttrs } from "./actions";
import { dock, removeTab, removeTabset } from "./docking";
import { uniqueFloatName } from "./floats";
import { jsonEqual } from "./json-equal";
import {
  mutableRowAttrsSchema,
  mutableTabAttrsSchema,
  mutableTabsetAttrsSchema,
} from "./node-attrs";

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
    case "addNode":
    case "dockFloat":
    case "floatTab":
    case "floatTabset":
    case "moveNode":
    case "moveTabset": {
      dock(draft, action);
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
      removeTab(draft, action.tabId);
      return;
    }
    case "deleteTabset": {
      removeTabset(draft, action.tabsetId);
      return;
    }
    case "moveFloat": {
      const float = findFloat(draft, action.floatId);
      if (float) {
        float.geometry = action.geometry;
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

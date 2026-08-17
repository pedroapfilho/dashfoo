import { clampSelected } from "../lib/clamp-selected";
import { createNodeId } from "../model/ids";
import type { Dashfoo, FloatNode, Geometry, RowNode, TabsetNode } from "../model/schema";
import { DEFAULT_WEIGHT } from "../model/schema";
import { collectTabsetsInRow } from "../model/tree";

import type { DockLocation } from "./actions";
import {
  mergeTabsInto,
  placeBesideTarget,
  removeTabsetReturning,
  wrapTabsetInLayout,
} from "./surgery";

const DEFAULT_FLOAT_GEOMETRY: Geometry = { height: 360, left: 80, top: 80, width: 480 };

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
    name: uniqueFloatName("Panel", draft.floats),
    type: "float",
  };
  draft.floats = [...draft.floats, float];

  const tabsets: Array<TabsetNode> = [];
  collectTabsetsInRow(layout, tabsets);
  const first = tabsets.at(0);
  if (first) {
    draft.activeTabsetId = first.id;
  }
};

const floatTabsetById = (
  draft: Dashfoo,
  tabsetId: string,
  geometry: Geometry | undefined,
  floatId: string | undefined,
): boolean => {
  const detached = removeTabsetReturning(draft, tabsetId);
  if (!detached) {
    return false;
  }
  pushFloat(draft, wrapTabsetInLayout(detached), geometry, floatId);
  return true;
};

const resolveMainTarget = (
  draft: Dashfoo,
  targetId: string | undefined,
): TabsetNode | undefined => {
  const mainTabsets: Array<TabsetNode> = [];
  collectTabsetsInRow(draft.layout, mainTabsets);
  if (targetId !== undefined) {
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
): boolean => {
  const index = draft.floats.findIndex((float) => float.id === floatId);
  const float = draft.floats.at(index);
  if (index === -1 || !float) {
    return false;
  }

  const tabsets: Array<TabsetNode> = [];
  collectTabsetsInRow(float.layout, tabsets);
  const tabs = tabsets.flatMap((tabset) => tabset.children);
  if (tabs.length === 0) {
    return false;
  }

  const leadTabset = tabsets.at(0);
  const selectedOffset = leadTabset
    ? clampSelected(leadTabset.children.length, leadTabset.selected)
    : 0;

  // Resolved before the float leaves `draft.floats`: nothing is removed until
  // there is somewhere for its tabs to land.
  const target = resolveMainTarget(draft, targetId);
  draft.floats.splice(index, 1);

  if (!target) {
    draft.layout = float.layout;
    draft.activeTabsetId = leadTabset?.id;
    return true;
  }

  if (location === "center") {
    mergeTabsInto(target, tabs, selectedOffset);
    draft.activeTabsetId = target.id;
    return true;
  }

  const placed: TabsetNode =
    tabsets.length === 1 && leadTabset
      ? leadTabset
      : {
          children: tabs,
          id: createNodeId("tabset"),
          selected: selectedOffset,
          type: "tabset",
          weight: DEFAULT_WEIGHT,
        };
  return placeBesideTarget(draft, placed, target.id, location ?? "split-right");
};

export { dockFloat, floatTabsetById, pushFloat, uniqueFloatName };

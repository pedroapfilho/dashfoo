import { isCollapsed } from "../state/collapse";

import type { Dashfoo, FloatNode, RowNode, SelectOnRemove, TabsetNode } from "./schema";

type RowChild = RowNode["children"][number];

const clampSelected = (length: number, selected: number): number => {
  if (length === 0) {
    return 0;
  }

  const base = Number.isFinite(selected) ? Math.trunc(selected) : 0;

  if (base < 0) {
    return 0;
  }

  if (base > length - 1) {
    return length - 1;
  }

  return base;
};

/** The selected tab always heads the history, so every selection change records itself. */
const recordSelection = (tabset: TabsetNode, selected: number): Array<string> => {
  const head = tabset.children[selected]?.id;
  const ids = new Set(tabset.children.map((tab) => tab.id));
  const rest = (tabset.selectionHistory ?? []).filter((id) => id !== head && ids.has(id));

  return head === undefined ? rest : [head, ...rest];
};

const sameIds = (a: Array<string> | undefined, b: Array<string> | undefined): boolean => {
  if (a === undefined || b === undefined) {
    return a === b;
  }

  return a.length === b.length && a.every((id, index) => id === b[index]);
};

/** Returns `tabset` itself when it is already tidy, so untouched tabsets keep their identity. */
const tidyTabset = (tabset: TabsetNode, policy: SelectOnRemove | undefined): TabsetNode => {
  const selected = clampSelected(tabset.children.length, tabset.selected);
  const collapsed = tabset.collapsible === true && tabset.collapsed === true ? true : undefined;
  const selectionHistory = policy === "recent" ? recordSelection(tabset, selected) : undefined;

  const tidy =
    selected === tabset.selected &&
    collapsed === tabset.collapsed &&
    sameIds(selectionHistory, tabset.selectionHistory);

  return tidy ? tabset : { ...tabset, collapsed, selected, selectionHistory };
};

/** Collapsed children give their space to an expanded sibling, so a row of only collapsed ones expands them all. */
const expandIfAllCollapsed = (children: RowNode["children"]): RowNode["children"] =>
  children.length > 0 && children.every(isCollapsed)
    ? children.map((child) =>
        child.type === "tabset" ? { ...child, collapsed: undefined } : child,
      )
    : children;

/**
 * The survivor takes over the collapsed row's slot, so it has to take the slot's
 * sizing too: dropping it widens a pinned sidebar, permanently, since this runs
 * on every persist. `snap` is row-only, so it travels only to a row survivor.
 */
const inheritSlot = (row: RowNode, survivor: RowChild): RowChild => {
  const sized: RowChild = {
    ...survivor,
    weight: row.weight,
  };

  if (row.min !== undefined) {
    sized.min = row.min;
  }

  if (row.max !== undefined) {
    sized.max = row.max;
  }

  if (sized.type === "row" && row.snap !== undefined) {
    return { ...sized, snap: row.snap };
  }

  return sized;
};

/** Records the id of every tabset it keeps, in document order. */
const normalizeRowChildren = (
  children: RowNode["children"],
  keptTabsetIds: Array<string>,
  policy: SelectOnRemove | undefined,
): RowNode["children"] => {
  const out: RowNode["children"] = [];

  for (const child of children) {
    if (child.type === "tabset") {
      if (child.children.length > 0) {
        out.push(tidyTabset(child, policy));
        keptTabsetIds.push(child.id);
      }

      continue;
    }

    // A recorded id implies a survivor, which keeps its ancestor rows alive, so
    // a dropped row never leaves ids behind.
    const grandchildren = normalizeRowChildren(child.children, keptTabsetIds, policy);
    const [onlyGrandchild, ...otherGrandchildren] = grandchildren;

    if (!onlyGrandchild) {
      continue;
    }

    if (otherGrandchildren.length === 0) {
      out.push(inheritSlot(child, onlyGrandchild));
      continue;
    }

    out.push({ ...child, children: grandchildren });
  }

  return expandIfAllCollapsed(out);
};

const normalizeLayout = (
  root: RowNode,
  keptTabsetIds: Array<string>,
  policy: SelectOnRemove | undefined,
): RowNode => {
  let children = normalizeRowChildren(root.children, keptTabsetIds, policy);
  let orientation = root.orientation;

  let inner = children[0];

  while (children.length === 1 && inner?.type === "row") {
    children = inner.children;
    orientation = inner.orientation;
    inner = children[0];
  }

  return { ...root, children, orientation };
};

const normalize = (model: Dashfoo): Dashfoo => {
  const mainTabsetIds: Array<string> = [];
  const policy = model.global.tabSetSelectOnRemove;
  const layout = normalizeLayout(model.layout, mainTabsetIds, policy);

  const floats: Array<FloatNode> = [];
  const floatTabsetIds: Array<string> = [];

  for (const float of model.floats) {
    const ownTabsetIds: Array<string> = [];
    const floatLayout = normalizeLayout(float.layout, ownTabsetIds, policy);

    if (floatLayout.children.length > 0) {
      floats.push({ ...float, layout: floatLayout });
      floatTabsetIds.push(...ownTabsetIds);
    }
  }

  const mainIds = new Set(mainTabsetIds);
  const liveIds = new Set([...mainTabsetIds, ...floatTabsetIds]);
  const firstTabsetId = mainTabsetIds[0] ?? floatTabsetIds[0];

  const activeTabsetId =
    model.activeTabsetId !== undefined && liveIds.has(model.activeTabsetId)
      ? model.activeTabsetId
      : firstTabsetId;

  // Main layout only: floats opt out of maximize, so an id that moved into one
  // would render twice, in the main area and inside the float.
  const maximizedTabsetId =
    model.maximizedTabsetId !== undefined && mainIds.has(model.maximizedTabsetId)
      ? model.maximizedTabsetId
      : undefined;

  return { ...model, activeTabsetId, floats, layout, maximizedTabsetId };
};

export { clampSelected, normalize };

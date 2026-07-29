import type { Dashfoo, FloatNode, RowNode, TabsetNode } from "./schema";
import { collectTabsets } from "./tree";

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

const normalizeTabset = (tabset: TabsetNode): TabsetNode => ({
  ...tabset,
  selected: clampSelected(tabset.children.length, tabset.selected),
});

type RowChild = RowNode["children"][number];

/**
 * A row that collapses to a single child hands its slot in the parent to
 * that child, so the slot's sizing constraints have to travel with it.
 * Dropping them silently widens a pinned sidebar, and `normalize` runs on
 * load and on every persist, so the loss is permanent.
 *
 * `snap` only exists on rows, so it is carried only to a row survivor.
 */
const inheritSlot = (row: RowNode, survivor: RowChild): RowChild => {
  const sized: RowChild = {
    ...survivor,
    ...(row.weight === undefined ? {} : { weight: row.weight }),
    ...(row.min === undefined ? {} : { min: row.min }),
    ...(row.max === undefined ? {} : { max: row.max }),
  };

  if (sized.type === "row" && row.snap !== undefined) {
    return { ...sized, snap: row.snap };
  }
  return sized;
};

const normalizeRowChildren = (children: RowNode["children"]): RowNode["children"] => {
  const out: RowNode["children"] = [];

  for (const child of children) {
    if (child.type === "tabset") {
      if (child.children.length > 0) {
        out.push(normalizeTabset(child));
      }
      continue;
    }

    const grandchildren = normalizeRowChildren(child.children);
    if (grandchildren.length === 0) {
      continue;
    }
    if (grandchildren.length === 1) {
      const only = grandchildren[0];
      if (only !== undefined) {
        out.push(inheritSlot(child, only));
      }
      continue;
    }
    out.push({ ...child, children: grandchildren });
  }

  return out;
};

const rowContainsTabset = (row: RowNode): boolean =>
  row.children.some((child) => (child.type === "tabset" ? true : rowContainsTabset(child)));

const normalizeLayout = (root: RowNode): RowNode => {
  let children = normalizeRowChildren(root.children);
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
  const layout = normalizeLayout(model.layout);

  const healedFloats: Array<FloatNode> = [];
  for (const float of model.floats ?? []) {
    const floatLayout = normalizeLayout(float.layout);
    if (rowContainsTabset(floatLayout)) {
      healedFloats.push({ ...float, layout: floatLayout });
    }
  }
  const floats = healedFloats.length > 0 ? healedFloats : undefined;

  const withRoots: Dashfoo = { ...model, floats, layout };

  const tabsetIds = new Set(collectTabsets(withRoots).map((tabset) => tabset.id));
  const firstTabsetId = collectTabsets(withRoots)[0]?.id;

  const activeTabsetId =
    model.activeTabsetId !== undefined && tabsetIds.has(model.activeTabsetId)
      ? model.activeTabsetId
      : firstTabsetId;

  const maximizedTabsetId =
    model.maximizedTabsetId !== undefined && tabsetIds.has(model.maximizedTabsetId)
      ? model.maximizedTabsetId
      : undefined;

  return { ...withRoots, activeTabsetId, maximizedTabsetId };
};

export { clampSelected, normalize };

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
        out.push(child.weight === undefined ? only : { ...only, weight: child.weight });
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

export { normalize };

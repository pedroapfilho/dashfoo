import type { Dashfoo, FloatNode, RowNode } from "./schema";
import { collectTabsets } from "./tree";

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
    weight: row.weight,
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
        out.push(child);
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

  const floats: Array<FloatNode> = [];
  for (const float of model.floats) {
    const floatLayout = normalizeLayout(float.layout);
    if (rowContainsTabset(floatLayout)) {
      floats.push({ ...float, layout: floatLayout });
    }
  }

  const withRoots: Dashfoo = { ...model, floats, layout };

  const tabsets = collectTabsets(withRoots);
  const tabsetIds = new Set(tabsets.map((tabset) => tabset.id));
  const firstTabsetId = tabsets[0]?.id;

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

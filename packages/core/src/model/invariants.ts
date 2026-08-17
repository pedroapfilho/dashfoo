import type { Dashfoo, FloatNode, RowNode } from "./schema";

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

/**
 * Records the id of every tabset it keeps, in document order. Two later passes
 * used to re-derive that list, each a restatement of the rule applied here and
 * free to drift from it, so pruning now reports what it kept.
 */
const normalizeRowChildren = (
  children: RowNode["children"],
  keptTabsetIds: Array<string>,
): RowNode["children"] => {
  const out: RowNode["children"] = [];

  for (const child of children) {
    if (child.type === "tabset") {
      if (child.children.length > 0) {
        out.push(child);
        keptTabsetIds.push(child.id);
      }
      continue;
    }

    // An id is recorded only for a tabset that survives, and a surviving tabset
    // keeps every ancestor row alive, so a dropped row never leaves ids behind.
    const grandchildren = normalizeRowChildren(child.children, keptTabsetIds);
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

const normalizeLayout = (root: RowNode, keptTabsetIds: Array<string>): RowNode => {
  let children = normalizeRowChildren(root.children, keptTabsetIds);
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
  const layout = normalizeLayout(model.layout, mainTabsetIds);

  const floats: Array<FloatNode> = [];
  const floatTabsetIds: Array<string> = [];
  for (const float of model.floats) {
    const ownTabsetIds: Array<string> = [];
    const floatLayout = normalizeLayout(float.layout, ownTabsetIds);
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

  /**
   * Checked against the main layout only. A float opts out of maximize
   * entirely, so a maximized id that has moved into one would be rendered
   * twice: once as the main area's maximized view, once inside the float.
   */
  const maximizedTabsetId =
    model.maximizedTabsetId !== undefined && mainIds.has(model.maximizedTabsetId)
      ? model.maximizedTabsetId
      : undefined;

  return { ...model, activeTabsetId, floats, layout, maximizedTabsetId };
};

export { normalize };

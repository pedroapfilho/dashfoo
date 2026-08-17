import type { Dashfoo, FloatNode, RowNode } from "./schema";

type RowChild = RowNode["children"][number];

/**
 * The survivor takes over the collapsed row's slot, so it has to take the slot's
 * sizing too: dropping it widens a pinned sidebar, permanently, since this runs
 * on every persist. `snap` is row-only, so it travels only to a row survivor.
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

/** Records the id of every tabset it keeps, in document order. */
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

    // A recorded id implies a survivor, which keeps its ancestor rows alive, so
    // a dropped row never leaves ids behind.
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

  // Main layout only: floats opt out of maximize, so an id that moved into one
  // would render twice, in the main area and inside the float.
  const maximizedTabsetId =
    model.maximizedTabsetId !== undefined && mainIds.has(model.maximizedTabsetId)
      ? model.maximizedTabsetId
      : undefined;

  return { ...model, activeTabsetId, floats, layout, maximizedTabsetId };
};

export { normalize };

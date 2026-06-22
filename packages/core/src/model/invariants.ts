import type { Dashfoo, RowNode, TabsetNode, WindowNode } from "./schema";
import { collectTabsets } from "./tree";

const clampSelected = (length: number, selected: number): number => {
  if (length === 0) {
    return 0;
  }
  // coerce to a non-negative integer first to match the schema's z.number().int():
  // a persisted 1.5 or NaN must not survive as a fractional/NaN index.
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

// Drop empty tabsets and empty rows, recurse into child rows, and simplify a
// single-child row by lifting its lone child (which inherits the lifted row's
// weight so sizing is preserved).
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

// The root is always a row; if it reduces to a single child that is itself a
// row, absorb that row (adopt its children + orientation) to avoid redundant
// nesting.
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

// Self-healing pass run after every action so the tree stays canonical: no empty
// tabsets or rows, no redundant single-child rows, selected indices in range,
// and active/maximized ids that always point at an existing tabset.
const normalize = (model: Dashfoo): Dashfoo => {
  const layout = normalizeLayout(model.layout);

  // Heal each window's own layout, then drop any window that emptied out (its
  // last tab closed/moved away) — the window equivalent of empty-tabset cleanup.
  const healedWindows: Array<WindowNode> = [];
  for (const window of model.windows ?? []) {
    const windowLayout = normalizeLayout(window.layout);
    if (rowContainsTabset(windowLayout)) {
      healedWindows.push({ ...window, layout: windowLayout });
    }
  }
  const windows = healedWindows.length > 0 ? healedWindows : undefined;

  const withRoots: Dashfoo = { ...model, layout, windows };

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

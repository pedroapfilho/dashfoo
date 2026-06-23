import { normalize } from "./invariants";
import type { Dashfoo, Orientation, TabsetNode } from "./schema";
import { collectTabsetsInRow } from "./tree";

// Flatten the MAIN layout into a single row (default a column) of all its
// tabsets, in document order, each with equal weight, so nothing is lost on a
// narrow screen; maximize is cleared. Detached windows are independent frames, so
// `windows` passes through untouched — pulling their tabsets into the main layout
// would duplicate panels already rendered in their popups. The building block for
// a mobile breakpoint: `stackModel(desktopModel)`.
const stackModel = (model: Dashfoo, orientation: Orientation = "column"): Dashfoo => {
  // Equal weight so stacked panels share the space evenly. A loop (not map) so we
  // create fresh nodes without mutating the shared input tabsets.
  const mainTabsets: Array<TabsetNode> = [];
  collectTabsetsInRow(model.layout, mainTabsets);
  const children: Array<TabsetNode> = [];
  for (const tabset of mainTabsets) {
    children.push({ ...tabset, weight: 1 });
  }

  return normalize({
    ...model,
    layout: { children, id: model.layout.id, orientation, type: "row" },
    maximizedTabsetId: undefined,
  });
};

export { stackModel };

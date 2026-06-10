import { normalize } from "./invariants";
import type { Dashfoo, Orientation, TabsetNode } from "./schema";
import { collectTabsets } from "./tree";

// Flatten any layout into a single row (default a column) of all its tabsets, in
// document order, each with equal weight, so nothing is lost on a narrow screen;
// maximize is cleared. The building block for a mobile breakpoint:
// `stackModel(desktopModel)`.
const stackModel = (model: Dashfoo, orientation: Orientation = "column"): Dashfoo => {
  // Equal weight so stacked panels share the space evenly. A loop (not map) so we
  // create fresh nodes without mutating the shared input tabsets.
  const children: Array<TabsetNode> = [];
  for (const tabset of collectTabsets(model)) {
    children.push({ ...tabset, collapsed: undefined, weight: 1 });
  }

  return normalize({
    ...model,
    layout: { children, id: model.layout.id, orientation, type: "row" },
    maximizedTabsetId: undefined,
  });
};

export { stackModel };

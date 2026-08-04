import { normalize } from "./invariants";
import type { Dashfoo, Orientation, TabsetNode } from "./schema";
import { collectTabsetsInRow } from "./tree";

const stackModel = (model: Dashfoo, orientation: Orientation = "column"): Dashfoo => {
  const mainTabsets: Array<TabsetNode> = [];
  collectTabsetsInRow(model.layout, mainTabsets);
  const children: Array<TabsetNode> = [];
  for (const tabset of mainTabsets) {
    children.push({ ...tabset, weight: 1 });
  }

  return normalize({
    ...model,
    layout: {
      children,
      id: model.layout.id,
      orientation,
      type: "row",
      weight: model.layout.weight,
    },
    maximizedTabsetId: undefined,
  });
};

export { stackModel };

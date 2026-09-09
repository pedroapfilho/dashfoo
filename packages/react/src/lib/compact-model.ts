import type { Dashfoo, Orientation, RowNode } from "@dashfoo/core";

const compactRow = (node: RowNode, orientation: Orientation): RowNode => {
  const children = node.children.map((child) =>
    child.type === "row" ? compactRow(child, orientation) : { ...child, weight: 1 },
  );
  return {
    ...node,
    children,
    orientation,
    weight: children.reduce((sum, child) => sum + child.weight, 0),
  };
};

// Flattening with core's stackModel reparents nested tabsets in React, losing
// widget state. Keep every ancestor and distribute space by descendant count.
const compactModel = (model: Dashfoo, orientation: Orientation = "column"): Dashfoo => ({
  ...model,
  layout: compactRow(model.layout, orientation),
  maximizedTabsetId: undefined,
});

export { compactModel };

import { row } from "../model/builders";
import type { SplitLocation } from "../model/dock-location";
import { SPLIT_PLACEMENT } from "../model/dock-location";
import type { RowNode, TabsetNode } from "../model/schema";

/** The share of the layout a tab or tabset docked at its edge takes, like a sidebar or a bottom panel. */
const EDGE_DOCK_SHARE = 0.25;

/** Keeps the root's id, so the layout stays addressable as a target after it wraps. */
const placeAtEdge = (root: RowNode, placed: TabsetNode, location: SplitLocation): TabsetNode => {
  const { before, orientation } = SPLIT_PLACEMENT[location];
  const rest = 1 - EDGE_DOCK_SHARE;

  if (root.orientation === orientation) {
    // A tabset its only tab just left is pruned by `normalize`, so its share would skew the edge.
    const total = root.children.reduce(
      (sum, child) =>
        child.type === "tabset" && child.children.length === 0 ? sum : sum + child.weight,
      0,
    );

    placed.weight = total > 0 ? (total * EDGE_DOCK_SHARE) / rest : 1;
  } else {
    const inner = row(root.children, { orientation: root.orientation, weight: rest });
    placed.weight = EDGE_DOCK_SHARE;
    root.orientation = orientation;
    root.children = [inner];
  }

  if (before) {
    root.children.unshift(placed);
  } else {
    root.children.push(placed);
  }

  return placed;
};

export { placeAtEdge };

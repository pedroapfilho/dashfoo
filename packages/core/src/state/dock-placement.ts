import type { Edge, Orientation } from "../model/schema";

import type { DockLocation } from "./actions";

/** The four locations that produce a split. `center` merges instead, so it is not one of them. */
type SplitLocation = Exclude<DockLocation, "center">;

type SplitPlacement = { before: boolean; edge: Edge; orientation: Orientation };

/**
 * The one reading of a split location, shared by the docking surgery and the
 * drop geometry so the highlighted half and the inserted tabset cannot
 * disagree. Total, so a new split location is a compile error here.
 */
const SPLIT_PLACEMENT = {
  "split-bottom": { before: false, edge: "bottom", orientation: "column" },
  "split-left": { before: true, edge: "left", orientation: "row" },
  "split-right": { before: false, edge: "right", orientation: "row" },
  "split-top": { before: true, edge: "top", orientation: "column" },
} as const satisfies Record<SplitLocation, SplitPlacement>;

export { SPLIT_PLACEMENT };
export type { SplitLocation };

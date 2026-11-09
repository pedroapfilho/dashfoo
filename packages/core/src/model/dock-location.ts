import { z } from "zod";

import type { Orientation } from "./schema";

const dockLocationSchema = z.enum([
  "center",
  "split-bottom",
  "split-left",
  "split-right",
  "split-top",
]);

type DockLocation = z.infer<typeof dockLocationSchema>;

/** The four locations that produce a split. `center` merges instead, so it is not one of them. */
type SplitLocation = Exclude<DockLocation, "center">;

type SplitPlacement = { before: boolean; orientation: Orientation };

/**
 * The one reading of a split location, shared by the docking surgery and the
 * drop geometry so the highlighted half and the inserted tabset cannot
 * disagree. Total, so a new split location is a compile error here.
 */
const SPLIT_PLACEMENT = {
  "split-bottom": { before: false, orientation: "column" },
  "split-left": { before: true, orientation: "row" },
  "split-right": { before: false, orientation: "row" },
  "split-top": { before: true, orientation: "column" },
} as const satisfies Record<SplitLocation, SplitPlacement>;

export { dockLocationSchema, SPLIT_PLACEMENT };

export type { DockLocation, SplitLocation };

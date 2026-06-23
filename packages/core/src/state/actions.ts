import { z } from "zod";

import {
  dimensionSchema,
  geometrySchema,
  globalAttributesSchema,
  orientationSchema,
  snapSchema,
  tabNodeSchema,
  tabsetNodeSchema,
} from "../model/schema";

const mutableTabAttrsSchema = tabNodeSchema
  .pick({
    config: true,
    enableClose: true,
    enableDrag: true,
    enableRename: true,
    name: true,
  })
  .partial();

const mutableTabsetAttrsSchema = tabsetNodeSchema
  .pick({
    enableClose: true,
    enableMaximize: true,
    max: true,
    min: true,
    selected: true,
    weight: true,
  })
  .partial();

const mutableRowAttrsSchema = z
  .object({
    max: dimensionSchema.optional(),
    min: dimensionSchema.optional(),
    orientation: orientationSchema,
    snap: snapSchema.optional(),
    weight: z.number(),
  })
  .partial();

const mutableNodeAttrsSchema = z.union([
  mutableTabAttrsSchema,
  mutableTabsetAttrsSchema,
  mutableRowAttrsSchema,
]);

// Every document mutation is one of these immutable, discriminated actions. The
// reducer is exhaustive over this union; the React layer validates untrusted
// payloads against actionSchema before dispatch.
const dockLocationSchema = z.enum([
  "center",
  "split-bottom",
  "split-left",
  "split-right",
  "split-top",
]);

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    index: z.number().int().optional(),
    location: dockLocationSchema,
    tab: tabNodeSchema,
    targetId: z.string(),
    type: z.literal("addNode"),
  }),
  z.object({
    index: z.number().int().optional(),
    location: dockLocationSchema,
    sourceId: z.string(),
    targetId: z.string(),
    type: z.literal("moveNode"),
  }),
  z.object({
    index: z.number().int().optional(),
    location: dockLocationSchema,
    sourceId: z.string(),
    targetId: z.string(),
    type: z.literal("moveTabset"),
  }),
  z.object({ index: z.number().int(), tabsetId: z.string(), type: z.literal("selectTab") }),
  z.object({ tabsetId: z.string(), type: z.literal("setActiveTabset") }),
  z.object({ tabsetId: z.string().nullable(), type: z.literal("setMaximizedTabset") }),
  z.object({ name: z.string(), tabId: z.string(), type: z.literal("renameTab") }),
  z.object({ tabId: z.string(), type: z.literal("deleteTab") }),
  z.object({ tabsetId: z.string(), type: z.literal("deleteTabset") }),
  z.object({
    rowId: z.string(),
    type: z.literal("adjustSplit"),
    weights: z.array(z.number()),
  }),
  z.object({
    attrs: mutableNodeAttrsSchema,
    nodeId: z.string(),
    type: z.literal("updateNodeAttributes"),
  }),
  z.object({ attrs: globalAttributesSchema.partial(), type: z.literal("updateGlobalAttributes") }),
  // Float a single tab out of its tabset into a new floating panel. `geometry` is
  // the float's initial in-app rect; `floatId` lets the caller mint the id so the
  // model node and any UI tracking it agree.
  z.object({
    floatId: z.string().optional(),
    geometry: geometrySchema.optional(),
    tabId: z.string(),
    type: z.literal("floatTab"),
  }),
  // Float a whole tabset (with all its tabs) into a new floating panel.
  z.object({
    floatId: z.string().optional(),
    geometry: geometrySchema.optional(),
    tabsetId: z.string(),
    type: z.literal("floatTabset"),
  }),
  // Dock a floating panel's tabs back into the main layout, then drop the float.
  // `targetId`/`location` default to the active main tabset, center.
  z.object({
    floatId: z.string(),
    location: dockLocationSchema.optional(),
    targetId: z.string().optional(),
    type: z.literal("dockFloat"),
  }),
  // Persist a float's rect as the user drags or resizes it.
  z.object({
    floatId: z.string(),
    geometry: geometrySchema,
    type: z.literal("moveFloat"),
  }),
  // Collapse a float to a chip (minimized: true) or restore it (false).
  z.object({
    floatId: z.string(),
    minimized: z.boolean(),
    type: z.literal("setFloatMinimized"),
  }),
]);

type DockLocation = z.infer<typeof dockLocationSchema>;
type MutableNodeAttrs = z.infer<typeof mutableNodeAttrsSchema>;
type Action = z.infer<typeof actionSchema>;

// Where a drag will land: the dock location, the target tabset, and (for a tab
// stack) the slot index. Co-located with DockLocation; the drag machine and the
// React adapter both consume it.
type DropIntent = { index?: number; location: DockLocation; targetId: string };

export { actionSchema, dockLocationSchema, mutableNodeAttrsSchema };
export type { Action, DockLocation, DropIntent, MutableNodeAttrs };

import { z } from "zod";

import { dockLocationSchema } from "../model/dock-location";
import {
  geometrySchema,
  globalAttributesSchema,
  tabNodeSchema,
  tabsetNodeSchema,
} from "../model/schema";

import { mutableNodeAttrsSchema } from "./node-attrs";

const splitWeightsSchema = z.array(z.number());

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
  // No `index`: a tabset docks beside or merges into its target, so there is no
  // slot in a tab strip to land at.
  z.object({
    location: dockLocationSchema,
    sourceId: z.string(),
    targetId: z.string(),
    type: z.literal("moveTabset"),
  }),
  z.object({ index: z.number().int(), tabsetId: z.string(), type: z.literal("selectTab") }),
  z.object({ tabsetId: z.string(), type: z.literal("setActiveTabset") }),
  z.object({ tabsetId: z.string().nullable(), type: z.literal("setMaximizedTabset") }),
  z.object({ collapsed: z.boolean(), tabsetId: z.string(), type: z.literal("setTabsetCollapsed") }),
  z.object({ name: z.string(), tabId: z.string(), type: z.literal("renameTab") }),
  z.object({ tabId: z.string(), type: z.literal("deleteTab") }),
  z.object({ tabsetId: z.string(), type: z.literal("deleteTabset") }),
  z.object({
    rowId: z.string(),
    type: z.literal("adjustSplit"),
    weights: splitWeightsSchema,
  }),
  z.object({
    attrs: mutableNodeAttrsSchema,
    nodeId: z.string(),
    type: z.literal("updateNodeAttributes"),
  }),
  z.object({ attrs: globalAttributesSchema, type: z.literal("updateGlobalAttributes") }),

  z.object({
    floatId: z.string().optional(),
    geometry: geometrySchema.optional(),
    tabId: z.string(),
    type: z.literal("floatTab"),
  }),

  z.object({
    floatId: z.string().optional(),
    geometry: geometrySchema.optional(),
    tabsetId: z.string(),
    type: z.literal("floatTabset"),
  }),

  z.object({
    floatId: z.string(),
    location: dockLocationSchema.optional(),
    targetId: z.string().optional(),
    type: z.literal("dockFloat"),
  }),

  z.object({
    floatId: z.string(),
    geometry: geometrySchema,
    type: z.literal("moveFloat"),
  }),

  z.object({
    floatId: z.string(),
    minimized: z.boolean(),
    type: z.literal("setFloatMinimized"),
  }),

  z.object({
    floatId: z.string(),
    name: z.string(),
    type: z.literal("renameFloat"),
  }),

  z.object({ nodeId: z.string(), type: z.literal("tearOff") }),

  z.object({ nodeId: z.string(), type: z.literal("transferOut") }),

  z.object({
    index: z.number().int().optional(),
    location: dockLocationSchema,
    node: z.union([tabNodeSchema, tabsetNodeSchema]),
    targetId: z.string(),
    type: z.literal("transferIn"),
  }),
]);

type Action = z.infer<typeof actionSchema>;

export { actionSchema };

export type { Action };

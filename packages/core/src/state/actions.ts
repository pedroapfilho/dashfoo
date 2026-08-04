import { z } from "zod";

import { geometrySchema, globalAttributesSchema, tabNodeSchema } from "../model/schema";

import { mutableNodeAttrsSchema } from "./node-attrs";

const dockLocationSchema = z.enum([
  "center",
  "split-bottom",
  "split-left",
  "split-right",
  "split-top",
]);

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
    weights: splitWeightsSchema,
  }),
  z.object({
    attrs: mutableNodeAttrsSchema,
    nodeId: z.string(),
    type: z.literal("updateNodeAttributes"),
  }),
  z.object({ attrs: globalAttributesSchema.partial(), type: z.literal("updateGlobalAttributes") }),

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
]);

type DockLocation = z.infer<typeof dockLocationSchema>;
type MutableNodeAttrs = z.infer<typeof mutableNodeAttrsSchema>;
type Action = z.infer<typeof actionSchema>;

type DropIntent = { index?: number; location: DockLocation; targetId: string };

export { actionSchema, dockLocationSchema };
export type { Action, DockLocation, DropIntent, MutableNodeAttrs };

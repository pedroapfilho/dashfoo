import { z } from "zod";

import {
  globalAttributesSchema,
  orientationSchema,
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
  .object({ orientation: orientationSchema, weight: z.number() })
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
  z.object({ rowId: z.string(), type: z.literal("adjustSplit"), weights: z.array(z.number()) }),
  z.object({
    attrs: mutableNodeAttrsSchema,
    nodeId: z.string(),
    type: z.literal("updateNodeAttributes"),
  }),
  z.object({ attrs: globalAttributesSchema.partial(), type: z.literal("updateGlobalAttributes") }),
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

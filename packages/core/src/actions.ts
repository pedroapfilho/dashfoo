import { z } from "zod";

import {
  borderNodeSchema,
  dimensionSchema,
  edgeSchema,
  globalAttributesSchema,
  orientationSchema,
  tabNodeSchema,
  tabsetNodeSchema,
} from "./schema";

const mutableTabAttrsSchema = tabNodeSchema
  .pick({
    config: true,
    enableClose: true,
    enableDrag: true,
    enableRename: true,
    icon: true,
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
    size: true,
    weight: true,
  })
  .partial();

const mutableRowAttrsSchema = z
  .object({ orientation: orientationSchema, weight: z.number() })
  .partial();

const mutableBorderAttrsSchema = borderNodeSchema
  .pick({ mode: true, selected: true, size: true })
  .partial();

const mutableNodeAttrsSchema = z.union([
  mutableTabAttrsSchema,
  mutableTabsetAttrsSchema,
  mutableRowAttrsSchema,
  mutableBorderAttrsSchema,
]);

// Every document mutation is one of these immutable, discriminated actions. The
// reducer is exhaustive over this union; the React layer validates untrusted
// payloads against actionSchema before dispatch.
const actionSchema = z.discriminatedUnion("type", [
  z.object({ index: z.number().int(), tabsetId: z.string(), type: z.literal("selectTab") }),
  z.object({ tabsetId: z.string(), type: z.literal("setActiveTabset") }),
  z.object({ tabsetId: z.string().nullable(), type: z.literal("setMaximizedTabset") }),
  z.object({ name: z.string(), tabId: z.string(), type: z.literal("renameTab") }),
  z.object({ tabId: z.string(), type: z.literal("deleteTab") }),
  z.object({ tabsetId: z.string(), type: z.literal("deleteTabset") }),
  z.object({ rowId: z.string(), type: z.literal("adjustSplit"), weights: z.array(z.number()) }),
  z.object({ edge: edgeSchema, size: dimensionSchema, type: z.literal("adjustBorderSize") }),
  z.object({ edge: edgeSchema, index: z.number().int(), type: z.literal("setBorderSelected") }),
  z.object({
    attrs: mutableNodeAttrsSchema,
    nodeId: z.string(),
    type: z.literal("updateNodeAttributes"),
  }),
  z.object({ attrs: globalAttributesSchema.partial(), type: z.literal("updateGlobalAttributes") }),
]);

type MutableNodeAttrs = z.infer<typeof mutableNodeAttrsSchema>;
type Action = z.infer<typeof actionSchema>;

export { actionSchema, mutableNodeAttrsSchema };
export type { Action, MutableNodeAttrs };

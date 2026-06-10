import { z } from "zod";

// A JSON-serializable value. Per-tab `config` is validated against this so the
// model stays losslessly serializable (a function or symbol in config fails).
type JsonValue = string | number | boolean | null | Array<JsonValue> | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const edgeSchema = z.enum(["top", "bottom", "left", "right"]);
const unitSchema = z.enum(["px", "%", "em", "rem", "vh", "vw"]);
const orientationSchema = z.enum(["row", "column"]);

const dimensionSchema = z.object({
  unit: unitSchema,
  value: z.number(),
});

const tabNodeSchema = z.object({
  component: z.string(),
  config: jsonValueSchema.optional(),
  enableClose: z.boolean().optional(),
  enableDrag: z.boolean().optional(),
  enableRename: z.boolean().optional(),
  id: z.string(),
  name: z.string(),
  type: z.literal("tab"),
});

const tabsetNodeSchema = z.object({
  children: z.array(tabNodeSchema),
  enableClose: z.boolean().optional(),
  enableMaximize: z.boolean().optional(),
  id: z.string(),
  max: dimensionSchema.optional(),
  min: dimensionSchema.optional(),
  name: z.string().optional(),
  selected: z.number().int(),
  type: z.literal("tabset"),
  weight: z.number().optional(),
});

// RowNode is recursive (a row may contain rows), so its type is declared
// explicitly and the schema is built with z.lazy.
type RowNode = {
  children: Array<RowNode | z.infer<typeof tabsetNodeSchema>>;
  id: string;
  max?: z.infer<typeof dimensionSchema>;
  min?: z.infer<typeof dimensionSchema>;
  orientation: z.infer<typeof orientationSchema>;
  type: "row";
  weight?: number;
};

const rowNodeSchema: z.ZodType<RowNode> = z.lazy(() =>
  z.object({
    children: z.array(z.union([rowNodeSchema, tabsetNodeSchema])),
    id: z.string(),
    max: dimensionSchema.optional(),
    min: dimensionSchema.optional(),
    orientation: orientationSchema,
    type: z.literal("row"),
    weight: z.number().optional(),
  }),
);

const globalAttributesSchema = z.object({
  enableSplitDock: z.boolean().optional(),
  splitterSize: z.number().optional(),
  tabEnableClose: z.boolean().optional(),
  tabEnableRename: z.boolean().optional(),
  tabLocation: z.enum(["top", "bottom"]).optional(),
  tabSetEnableMaximize: z.boolean().optional(),
  tabSetEnableTabStrip: z.boolean().optional(),
  tabSetMinSize: z.number().optional(),
});

const dashfooSchema = z.object({
  activeTabsetId: z.string().optional(),
  global: globalAttributesSchema,
  layout: rowNodeSchema,
  maximizedTabsetId: z.string().optional(),
  // The persisted-payload format version, pinned by the schema itself: any
  // future format change bumps the literal, so foreign payloads fail validation.
  version: z.literal(1),
});

type Json = JsonValue;
type Edge = z.infer<typeof edgeSchema>;
type Unit = z.infer<typeof unitSchema>;
type Orientation = z.infer<typeof orientationSchema>;
type Dimension = z.infer<typeof dimensionSchema>;
type TabNode = z.infer<typeof tabNodeSchema>;
type TabsetNode = z.infer<typeof tabsetNodeSchema>;
type GlobalAttributes = z.infer<typeof globalAttributesSchema>;
type Dashfoo = z.infer<typeof dashfooSchema>;
type Node = RowNode | TabsetNode | TabNode;

export {
  dashfooSchema,
  dimensionSchema,
  edgeSchema,
  globalAttributesSchema,
  jsonValueSchema,
  orientationSchema,
  rowNodeSchema,
  tabNodeSchema,
  tabsetNodeSchema,
  unitSchema,
};

export type {
  Dashfoo,
  Dimension,
  Edge,
  GlobalAttributes,
  Json,
  Node,
  Orientation,
  RowNode,
  TabNode,
  TabsetNode,
  Unit,
};

import { z } from "zod";

import { clampSelected } from "../lib/clamp-selected";

/**
 * Weights are relative shares, and every reader that rendered one already
 * treated a missing weight as a single share (`row-view` summed `weight ?? 1`),
 * so filling it in at the boundary changes nothing on screen. The one place that
 * read a missing weight as a percentage was `placeBesideTarget`, which is why
 * docking beside an unweighted target halved it to `50` and left its unweighted
 * siblings rendering as a sliver of the row.
 */
const DEFAULT_WEIGHT = 1;

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

const snapSchema = z.object({
  divisions: z.union([z.number().positive(), z.literal("panels")]).optional(),
  step: z.number().min(0).optional(),
  threshold: z.number().positive().optional(),
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

/**
 * The pre-transform object, kept separate so `node-attrs` can `.pick()` mutable
 * keys off it. Picking from the transformed schema is impossible (a pipe has no
 * `.pick`), and picking `weight` with its default attached would inject that
 * default: `.partial()` over a defaulted field still fills it in, which would
 * rewrite a tabset's weight on every unrelated attribute update.
 */
const tabsetNodeObjectSchema = z.object({
  children: z.array(tabNodeSchema),
  enableClose: z.boolean().optional(),
  enableMaximize: z.boolean().optional(),
  id: z.string(),
  max: dimensionSchema.optional(),
  min: dimensionSchema.optional(),
  name: z.string().optional(),
  selected: z.number().int(),
  type: z.literal("tabset"),
  weight: z.number().default(DEFAULT_WEIGHT),
});

const tabsetNodeSchema = tabsetNodeObjectSchema.transform((tabset) => ({
  ...tabset,
  selected: clampSelected(tabset.children.length, tabset.selected),
}));

type RowNode = {
  children: Array<RowNode | z.infer<typeof tabsetNodeSchema>>;
  id: string;
  max?: z.infer<typeof dimensionSchema>;
  min?: z.infer<typeof dimensionSchema>;
  orientation: z.infer<typeof orientationSchema>;
  snap?: z.infer<typeof snapSchema>;
  type: "row";
  weight: number;
};

type RowNodeInput = {
  children: Array<RowNodeInput | z.input<typeof tabsetNodeSchema>>;
  id: string;
  max?: z.infer<typeof dimensionSchema>;
  min?: z.infer<typeof dimensionSchema>;
  orientation: z.infer<typeof orientationSchema>;
  snap?: z.infer<typeof snapSchema>;
  type: "row";
  weight?: number;
};

const rowNodeSchema: z.ZodType<RowNode, RowNodeInput> = z.lazy(() =>
  z.object({
    children: z.array(z.union([rowNodeSchema, tabsetNodeSchema])),
    id: z.string(),
    max: dimensionSchema.optional(),
    min: dimensionSchema.optional(),
    orientation: orientationSchema,
    snap: snapSchema.optional(),
    type: z.literal("row"),
    weight: z.number().default(DEFAULT_WEIGHT),
  }),
);

const geometrySchema = z.object({
  height: z.number(),
  left: z.number(),
  top: z.number(),
  width: z.number(),
});

const floatNodeSchema = z.object({
  geometry: geometrySchema,
  id: z.string(),
  layout: rowNodeSchema,

  minimized: z.boolean().optional(),
  name: z.string().optional(),
  type: z.literal("float"),
});

const globalAttributesSchema = z.object({
  enableSplitDock: z.boolean().optional(),
  enableSplitResize: z.boolean().optional(),
  snap: snapSchema.optional(),
  splitterSize: z.number().optional(),
  tabEnableClose: z.boolean().optional(),
  tabEnableDrag: z.boolean().optional(),
  tabEnableRename: z.boolean().optional(),
  tabLocation: z.enum(["top", "bottom"]).optional(),
  tabSetEnableMaximize: z.boolean().optional(),
  tabSetEnableTabStrip: z.boolean().optional(),
  tabSetMinSize: z.number().optional(),
});

const dashfooSchema = z.object({
  activeTabsetId: z.string().optional(),
  // A getter, not a literal: zod hands the same array instance to every parse of
  // a float-less model, and `dockFloat` splices its float list in place.
  floats: z.array(floatNodeSchema).default(() => []),
  global: globalAttributesSchema,
  layout: rowNodeSchema,
  maximizedTabsetId: z.string().optional(),
  version: z.literal(1),
});

type Json = JsonValue;
type Edge = z.infer<typeof edgeSchema>;
type Unit = z.infer<typeof unitSchema>;
type Orientation = z.infer<typeof orientationSchema>;
type Dimension = z.infer<typeof dimensionSchema>;
type SnapConfig = z.infer<typeof snapSchema>;
type TabNode = z.infer<typeof tabNodeSchema>;
type TabsetNode = z.infer<typeof tabsetNodeSchema>;
type Geometry = z.infer<typeof geometrySchema>;
type FloatNode = z.infer<typeof floatNodeSchema>;
type GlobalAttributes = z.infer<typeof globalAttributesSchema>;
type Dashfoo = z.infer<typeof dashfooSchema>;
/** The loose shape `dashfooSchema` accepts: `weight` and `floats` may be omitted. */
type DashfooInput = z.input<typeof dashfooSchema>;
type Node = RowNode | TabsetNode | TabNode;

export {
  dashfooSchema,
  DEFAULT_WEIGHT,
  dimensionSchema,
  edgeSchema,
  floatNodeSchema,
  geometrySchema,
  globalAttributesSchema,
  jsonValueSchema,
  orientationSchema,
  rowNodeSchema,
  snapSchema,
  tabNodeSchema,
  tabsetNodeObjectSchema,
  tabsetNodeSchema,
  unitSchema,
};

export type {
  Dashfoo,
  DashfooInput,
  Dimension,
  Edge,
  FloatNode,
  Geometry,
  GlobalAttributes,
  Json,
  Node,
  Orientation,
  RowNode,
  RowNodeInput,
  SnapConfig,
  TabNode,
  TabsetNode,
  Unit,
};

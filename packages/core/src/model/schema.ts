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

// Magnetic snap config for split resize. The grid the dragged boundary snaps to is
// the union of two optional sources: `step` (multiples of a fixed percent) and
// `divisions` (even splits — multiples of 100/d, where d is the number or, for
// "panels", the row's own child count, so a 3-panel row snaps to thirds and a
// 4-panel row to quarters). `threshold` is the magnetic grab distance in percent.
// An empty config (or a `step` of 0 with no `divisions`) disables snapping — used
// to opt a single row out of an inherited global default.
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
  snap?: z.infer<typeof snapSchema>;
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
    snap: snapSchema.optional(),
    type: z.literal("row"),
    weight: z.number().optional(),
  }),
);

// A floating panel's rectangle, in CSS pixels relative to the layout container.
// Captured when the panel is floated and refreshed as the user drags or resizes
// it, so the model round-trips the float's position.
const geometrySchema = z.object({
  height: z.number(),
  left: z.number(),
  top: z.number(),
  width: z.number(),
});

// A floating panel: a tabset (or split) lifted out of the docked layout into a
// draggable, resizable overlay that still lives in the same app. It owns a full
// RowNode layout (the same shape as the main root), so a float can hold a single
// tab, several tabs, or nested splits and reuses the exact same rendering.
const floatNodeSchema = z.object({
  geometry: geometrySchema,
  id: z.string(),
  layout: rowNodeSchema,
  // Collapsed to a small chip (the window minimized); geometry is preserved so
  // restoring reopens it at its previous rect.
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
  global: globalAttributesSchema,
  layout: rowNodeSchema,
  maximizedTabsetId: z.string().optional(),
  // The persisted-payload format version, pinned by the schema itself: any
  // future format change bumps the literal, so foreign payloads fail validation.
  version: z.literal(1),
  // Floating panels, each owning its own layout subtree. Optional so existing
  // payloads (and hand-built models) stay valid; absent means "nothing floating".
  floats: z.array(floatNodeSchema).optional(),
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
type Node = RowNode | TabsetNode | TabNode;

export {
  dashfooSchema,
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
  tabsetNodeSchema,
  unitSchema,
};

export type {
  Dashfoo,
  Dimension,
  Edge,
  FloatNode,
  Geometry,
  GlobalAttributes,
  Json,
  Node,
  Orientation,
  RowNode,
  SnapConfig,
  TabNode,
  TabsetNode,
  Unit,
};

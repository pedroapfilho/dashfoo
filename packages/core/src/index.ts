export { dropIndicator, resolveDropIntent } from "./dock/drop-intent";

export type {
  Direction,
  DragSubject,
  DropIndicator,
  DropIntent,
  DropIntentOptions,
  MeasuredLayout,
  MeasuredStrip,
  MeasuredTab,
  MeasuredTabset,
} from "./dock/drop-intent";

export { dockZonePolygons, resolveDockTarget, zoneRect } from "./dock/geometry";

export type { DockZone, Point, Rect } from "./dock/geometry";

export { floatNode, model, row, tab, tabset } from "./model/builders";

export type {
  FloatOptions,
  ModelOptions,
  RowOptions,
  TabOptions,
  TabsetOptions,
} from "./model/builders";

export { dockLocationSchema } from "./model/dock-location";

export type { DockLocation } from "./model/dock-location";

export { createNodeId, createTabId } from "./model/ids";

export { normalize } from "./model/invariants";

export {
  dashfooSchema,
  DEFAULT_FLOAT_GEOMETRY,
  DEFAULT_FLOAT_NAME,
  DEFAULT_WEIGHT,
  dimensionSchema,
  floatNodeSchema,
  geometrySchema,
  globalAttributesSchema,
  jsonValueSchema,
  orientationSchema,
  rowNodeSchema,
  selectOnRemoveSchema,
  snapSchema,
  tabNodeSchema,
  tabsetNodeSchema,
  unitSchema,
} from "./model/schema";

export type {
  Dashfoo,
  DashfooInput,
  Dimension,
  FloatNode,
  Geometry,
  GlobalAttributes,
  Json,
  Node,
  Orientation,
  RowNode,
  RowNodeInput,
  SelectOnRemove,
  SnapConfig,
  TabNode,
  TabsetNode,
  Unit,
} from "./model/schema";

export { fromJSON, parseModel, restoreModel, toJSON } from "./model/serialize";

export type { MapTab, RestoreOptions } from "./model/serialize";

export { standaloneModel } from "./model/standalone";

export {
  collectRoots,
  collectTabsets,
  collectTabsetsInRow,
  findAttributedNode,
  findDuplicateIds,
  findFloat,
  findRow,
  findTab,
  findTabset,
  findTabsetParent,
  getFirstTabset,
} from "./model/tree";

export type { AttributedNode, TabLocation, TabsetSlot } from "./model/tree";

export { actionSchema } from "./state/actions";

export type { Action } from "./state/actions";

export {
  canRedoHistory,
  canUndoHistory,
  createHistory,
  dispatchToHistory,
  HISTORY_LIMIT,
  redoHistory,
  undoHistory,
} from "./state/history";

export type { History } from "./state/history";

export { mutableNodeAttrsSchema } from "./state/node-attrs";

export type { MutableNodeAttrs } from "./state/node-attrs";

export { reducer } from "./state/reducer";

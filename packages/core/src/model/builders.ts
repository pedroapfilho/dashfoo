// Ergonomic constructors for the layout model, so consumers seed a Dashfoo
// without hand-writing `type`/`version`/`selected` boilerplate or nested
// literals. Every builder fills the required-but-mechanical fields and leaves
// the meaningful ones (ids that get referenced, weights) to the caller. Output
// is schema-valid by construction; id uniqueness across reused components is
// the caller's responsibility (tabs default their id to the component name), so
// `model` warns once if it detects duplicate node ids.

import { createNodeId } from "./ids";
import type {
  Dashfoo,
  Dimension,
  FloatNode,
  Geometry,
  GlobalAttributes,
  Json,
  RowNode,
  SnapConfig,
  TabNode,
  TabsetNode,
} from "./schema";
import { findDuplicateIds } from "./tree";

const toDimension = (value: number | Dimension): Dimension =>
  typeof value === "number" ? { unit: "px", value } : value;

type TabOptions = {
  config?: Json;
  enableClose?: boolean;
  enableDrag?: boolean;
  enableRename?: boolean;
  id?: string;
};

// The id defaults to the component name — the common case where a layout holds
// one tab per component and references it by that name.
const tab = (component: string, name: string, options: TabOptions = {}): TabNode => ({
  component,
  name,
  type: "tab",
  ...options,
  id: options.id ?? component,
});

type TabsetOptions = {
  enableClose?: boolean;
  enableMaximize?: boolean;
  id?: string;
  max?: number | Dimension;
  min?: number | Dimension;
  name?: string;
  selected?: number;
  weight?: number;
};

const tabset = (children: Array<TabNode>, options: TabsetOptions = {}): TabsetNode => {
  const { max, min, ...rest } = options;
  return {
    children,
    type: "tabset",
    ...rest,
    ...(max === undefined ? {} : { max: toDimension(max) }),
    ...(min === undefined ? {} : { min: toDimension(min) }),
    id: options.id ?? createNodeId("tabset"),
    selected: options.selected ?? 0,
  };
};

type RowOptions = {
  id?: string;
  max?: number | Dimension;
  min?: number | Dimension;
  orientation?: RowNode["orientation"];
  snap?: SnapConfig;
  weight?: number;
};

const row = (children: RowNode["children"], options: RowOptions = {}): RowNode => {
  const { max, min, ...rest } = options;
  return {
    children,
    type: "row",
    ...rest,
    ...(max === undefined ? {} : { max: toDimension(max) }),
    ...(min === undefined ? {} : { min: toDimension(min) }),
    id: options.id ?? createNodeId("row"),
    orientation: options.orientation ?? "row",
  };
};

type FloatOptions = {
  id?: string;
  name?: string;
};

// A floating panel wrapping a layout subtree at a given in-app rect.
const floatNode = (layout: RowNode, geometry: Geometry, options: FloatOptions = {}): FloatNode => ({
  geometry,
  layout,
  type: "float",
  ...options,
  id: options.id ?? createNodeId("float"),
});

type ModelOptions = {
  activeTabsetId?: string;
  floats?: Array<FloatNode>;
  global?: GlobalAttributes;
  maximizedTabsetId?: string;
};

const model = (layout: RowNode, options: ModelOptions = {}): Dashfoo => {
  const built: Dashfoo = {
    layout,
    version: 1,
    ...options,
    global: options.global ?? {},
  };
  const duplicates = findDuplicateIds(built);
  if (duplicates.length > 0) {
    // oxlint-disable-next-line no-console
    console.warn(
      `[dashfoo] builder produced duplicate node ids: ${duplicates.join(", ")} — pass explicit ids when reusing a component`,
    );
  }
  return built;
};

export { floatNode, model, row, tab, tabset };
export type { FloatOptions, ModelOptions, RowOptions, TabOptions, TabsetOptions };

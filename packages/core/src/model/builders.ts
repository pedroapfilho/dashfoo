// Ergonomic constructors for the layout model, so consumers seed a Dashfoo
// without hand-writing `type`/`version`/`selected` boilerplate or nested
// literals. Every builder fills the required-but-mechanical fields and leaves
// the meaningful ones (ids that get referenced, weights) to the caller. Output
// is schema-valid by construction; id uniqueness across reused components is
// the caller's responsibility (tabs default their id to the component name), so
// `model` warns once if it detects duplicate node ids.

import { createNodeId } from "./ids";
import type { Dashfoo, GlobalAttributes, Json, RowNode, TabNode, TabsetNode } from "./schema";
import { findDuplicateIds } from "./tree";

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
  max?: TabsetNode["max"];
  min?: TabsetNode["min"];
  name?: string;
  selected?: number;
  weight?: number;
};

const tabset = (children: Array<TabNode>, options: TabsetOptions = {}): TabsetNode => ({
  children,
  type: "tabset",
  ...options,
  id: options.id ?? createNodeId("tabset"),
  selected: options.selected ?? 0,
});

type RowOptions = {
  id?: string;
  orientation?: RowNode["orientation"];
  weight?: number;
};

const row = (children: RowNode["children"], options: RowOptions = {}): RowNode => ({
  children,
  type: "row",
  ...options,
  id: options.id ?? createNodeId("row"),
  orientation: options.orientation ?? "row",
});

type ModelOptions = {
  activeTabsetId?: string;
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

export { model, row, tab, tabset };
export type { ModelOptions, RowOptions, TabOptions, TabsetOptions };

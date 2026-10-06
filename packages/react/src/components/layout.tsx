"use client";

import { DragLayer } from "../drag/drag-layer";

import { FloatLayer } from "./float-layer";
import { LayoutRoot } from "./layout-root";
import { RowView } from "./row-view";
import { TabsetView } from "./tabset/tabset-view";

const Layout = {
  DragLayer,
  FloatLayer,
  Root: LayoutRoot,
  Rows: RowView,
  Tabset: TabsetView,
} as const;

export { Layout };
export type { DragLayerProps as LayoutDragLayerProps } from "../drag/drag-layer";
export type { FloatLayerProps as LayoutFloatLayerProps } from "./float-layer";
export type { LayoutRenderers, LayoutRootProps } from "./layout-root";
export type { RowViewProps as LayoutRowsProps } from "./row-view";
export type { TabsetViewProps as LayoutTabsetProps } from "./tabset/tabset-view";

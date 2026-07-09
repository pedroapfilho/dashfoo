"use client";

import { DragProvider } from "./drag-adapter";
import { FloatLayer } from "./float-layer";
import { LayoutRoot } from "./layout-root";
import { RowView } from "./row-view";
import { TabsetView } from "./tabset/tabset-view";

const Layout = {
  DragLayer: DragProvider,
  FloatLayer,
  Root: LayoutRoot,
  Rows: RowView,
  Tabset: TabsetView,
} as const;

export { Layout };
export type { DragProviderProps as LayoutDragLayerProps } from "./drag-adapter";
export type { FloatLayerProps as LayoutFloatLayerProps } from "./float-layer";
export type { LayoutRootProps } from "./layout-root";
export type { RowViewProps as LayoutRowsProps } from "./row-view";
export type { TabsetViewProps as LayoutTabsetProps } from "./tabset/tabset-view";

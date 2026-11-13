"use client";

import { DragLayer } from "../drag/drag-layer";
import { FloatLayer } from "../float/float-layer";
import { TabsetView } from "../tabset/tabset-view";

import { LayoutRoot } from "./layout-root";
import { RowView } from "./row-view";

const Layout = {
  DragLayer,
  FloatLayer,
  Root: LayoutRoot,
  Rows: RowView,
  Tabset: TabsetView,
} as const;

export { Layout };

export type { DragLayerProps as LayoutDragLayerProps } from "../drag/drag-layer";

export type { FloatLayerProps as LayoutFloatLayerProps } from "../float/float-layer";

export type { LayoutOptions } from "./capabilities";

export type { LayoutRenderers, LayoutRootProps } from "./layout-root";

export type { RowViewProps as LayoutRowsProps } from "./row-view";

export type { TabsetViewProps as LayoutTabsetProps } from "../tabset/tabset-view";

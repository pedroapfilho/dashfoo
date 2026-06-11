"use client";

import { DragProvider } from "./drag-adapter";
import { LayoutRoot } from "./layout-root";
import { RowView } from "./row-view";
import { TabsetView } from "./tabset/tabset-view";

// Compound namespace for hand-built layouts, same pattern as Panel/Tabset:
// Root provides the layout store, DragLayer opts the tree into drag-dock,
// Rows renders the split tree, and Tabset is the stock tabset composition for
// leaves that don't need custom chrome.
const Layout = {
  DragLayer: DragProvider,
  Root: LayoutRoot,
  Rows: RowView,
  Tabset: TabsetView,
} as const;

export { Layout };
export type { DragProviderProps as LayoutDragLayerProps } from "./drag-adapter";
export type { LayoutRootProps } from "./layout-root";
export type { RowViewProps as LayoutRowsProps } from "./row-view";
export type { TabsetViewProps as LayoutTabsetProps } from "./tabset/tabset-view";

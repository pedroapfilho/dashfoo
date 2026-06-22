"use client";

// Public API for @dashfoo/react.
// DashfooLayout (store binding, registry/factory, views), the docking chrome
// (close/rename/maximize), layout persistence, and the Layout/Tabset/Panel
// compound primitives for hand-built layouts.

export * from "./components/dashfoo-layout";
export * from "./components/drag-root";
export * from "./components/layout";
export * from "./components/panel";
export { Tabset } from "./components/tabset/tabset";
export type {
  TabsetCloseButtonProps,
  TabsetContentProps,
  TabsetGripProps,
  TabsetMaximizeButtonProps,
  TabsetPopoutButtonProps,
  TabsetRenameInputProps,
  TabsetRootProps,
  TabsetTablistProps,
  TabsetTabProps,
  TabsetTabStripProps,
  TabsetToolbarProps,
  TabsetTriggerProps,
} from "./components/tabset/tabset";
export { useTab, useTabset } from "./components/tabset/tabset-store";
export type { TabContextValue, TabsetState } from "./components/tabset/tabset-store";
export { useLayout } from "./hooks/layout-store";
export type { LayoutState } from "./hooks/layout-store";
export * from "./hooks/persistence";
export * from "./hooks/responsive";
export * from "./hooks/store";
// drag-hooks stays internal except the external-source surface and the live
// drag reads (subject + drop intent) custom parts need for drag-aware styling
// and consumer-rendered drop indicators.
export { useDragSubject, useDropIntent, useExternalTabSource } from "./hooks/drag-hooks";
export type { ExternalTabSourceOptions } from "./hooks/drag-hooks";

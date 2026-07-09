"use client";

export * from "./components/dashfoo-layout";
export * from "./components/drag-root";
export * from "./components/layout";
export * from "./components/panel";
export { Tabset } from "./components/tabset/tabset";
export type {
  TabsetCloseButtonProps,
  TabsetContentProps,
  TabsetFloatButtonProps,
  TabsetGripProps,
  TabsetMaximizeButtonProps,
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

export { useDragSubject, useDropIntent, useExternalTabSource } from "./hooks/drag-hooks";
export type { ExternalTabSourceOptions } from "./hooks/drag-hooks";

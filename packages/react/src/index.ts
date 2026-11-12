"use client";

export * from "./layout/dashfoo-layout";

export * from "./layout/layout";

export * from "./ui/panel";

export { Tabset } from "./tabset/tabset";

export type {
  TabsetCloseButtonProps,
  TabsetCloseButtonState,
  TabsetCollapseButtonProps,
  TabsetCollapseButtonState,
  TabsetContentProps,
  TabsetFloatButtonProps,
  TabsetGripProps,
  TabsetGripState,
  TabsetMaximizeButtonProps,
  TabsetMaximizeButtonState,
  TabsetRenameInputProps,
  TabsetRootProps,
  TabsetTablistProps,
  TabsetTabProps,
  TabsetTabStripProps,
  TabsetToolbarProps,
  TabsetTriggerProps,
} from "./tabset/tabset";

export { useTab, useTabset } from "./tabset/tabset-store";

export type { TabContextValue, TabsetState } from "./tabset/tabset-store";

export { createTablistSpace } from "./tabset/tablist-space";

export type { TablistSpace, TablistSpaceListener } from "./tabset/tablist-space";

export { useLayout } from "./layout/layout-store";

export type { LayoutState } from "./layout/layout-store";

export { localStorageAdapter, memoryStorageAdapter } from "./store/persistence";

export type { PersistInput, StorageAdapter } from "./store/persistence";

export * from "./layout/responsive";

export * from "./store/store";

export {
  useDragSubject,
  useDropIndicator,
  useDropIntent,
  useExternalTabSource,
} from "./drag/drag-hooks";

export type { ExternalTabSourceOptions } from "./drag/drag-hooks";

export { DashfooDragProvider } from "./drag/drag-root";

export type { DragGroupScope } from "./drag/drag-group";

export type { TearOffHandler, TearOffRequest } from "./drag/tear-off";

export { measureTabset } from "./tabset/measure-tabset";

export type { StateProp, StatefulButtonProps } from "./lib/state-props";

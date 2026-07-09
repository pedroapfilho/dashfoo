"use client";

import { TabsetContent } from "./tabset-content";
import { TabsetOverflowMenu } from "./tabset-overflow";
import { TabsetRoot } from "./tabset-root";
import { TabsetTab, TabsetTrigger } from "./tabset-tab";
import { TabsetCloseButton, TabsetRenameInput } from "./tabset-tab-controls";
import { TabsetTablist, TabsetTabStrip } from "./tabset-tablist";
import {
  TabsetFloatButton,
  TabsetGrip,
  TabsetMaximizeButton,
  TabsetToolbar,
} from "./tabset-toolbar";

const Tabset = {
  CloseButton: TabsetCloseButton,
  Content: TabsetContent,
  FloatButton: TabsetFloatButton,
  Grip: TabsetGrip,
  MaximizeButton: TabsetMaximizeButton,
  OverflowMenu: TabsetOverflowMenu,
  RenameInput: TabsetRenameInput,
  Root: TabsetRoot,
  Tab: TabsetTab,
  Tablist: TabsetTablist,
  TabStrip: TabsetTabStrip,
  Toolbar: TabsetToolbar,
  Trigger: TabsetTrigger,
} as const;

export { Tabset };
export type { TabsetContentProps } from "./tabset-content";
export type { TabsetRootProps } from "./tabset-root";
export type { TabsetTabProps, TabsetTriggerProps } from "./tabset-tab";
export type { TabsetCloseButtonProps, TabsetRenameInputProps } from "./tabset-tab-controls";
export type { TabsetTablistProps, TabsetTabStripProps } from "./tabset-tablist";
export type {
  TabsetFloatButtonProps,
  TabsetGripProps,
  TabsetMaximizeButtonProps,
  TabsetToolbarProps,
} from "./tabset-toolbar";

"use client";

import { TabsetContent } from "./tabset-content";
import { TabsetOverflowMenu } from "./tabset-overflow";
import { TabsetRoot } from "./tabset-root";
import { TabsetTab, TabsetTrigger } from "./tabset-tab";
import { TabsetCloseButton, TabsetRenameInput } from "./tabset-tab-controls";
import { TabsetTablist, TabsetTabStrip } from "./tabset-tablist";
import {
  TabsetGrip,
  TabsetMaximizeButton,
  TabsetPopoutButton,
  TabsetToolbar,
} from "./tabset-toolbar";

// Compound namespace, same pattern as Panel: users compose the parts freely and
// they coordinate through the scoped store Tabset.Root provides.
const Tabset = {
  CloseButton: TabsetCloseButton,
  Content: TabsetContent,
  Grip: TabsetGrip,
  MaximizeButton: TabsetMaximizeButton,
  OverflowMenu: TabsetOverflowMenu,
  PopoutButton: TabsetPopoutButton,
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
  TabsetGripProps,
  TabsetMaximizeButtonProps,
  TabsetPopoutButtonProps,
  TabsetToolbarProps,
} from "./tabset-toolbar";

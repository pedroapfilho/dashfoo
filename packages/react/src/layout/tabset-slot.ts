"use client";

import { createContext, useContext } from "react";

/**
 * What the split around a tabset allows it, which only the split can tell.
 * A tabset rendered outside a split (maximized, or by a custom layout) gets
 * the default: never collapsed, and not alone.
 */
type TabsetSlot = {
  /** The only child of the root split, so maximizing it would change nothing. */
  alone: boolean;
  canCollapse: boolean;
  /** Shown collapsed: collapsed in the model, or collapsed to fit. */
  collapsed: boolean;
  /** Collapsed because the split is too small for its minimums; the model still has it expanded. */
  collapsedToFit: boolean;
  orientation: "column" | "row" | undefined;
};

const DEFAULT_SLOT: TabsetSlot = {
  alone: false,
  canCollapse: false,
  collapsed: false,
  collapsedToFit: false,
  orientation: undefined,
};

const TabsetSlotContext = createContext<TabsetSlot>(DEFAULT_SLOT);

const useTabsetSlot = (): TabsetSlot => useContext(TabsetSlotContext);

export { TabsetSlotContext, useTabsetSlot };

export type { TabsetSlot };

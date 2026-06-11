"use client";

import type { Action, TabNode, TabsetNode } from "@dashfoo/core";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { createStore, useStore } from "zustand";

// The layout-wide configuration every part below <Layout.Root> coordinates
// through: resolved chrome flags, slot renderers, and the model dispatcher.
// A scoped zustand store rather than a plain context value so parts subscribe
// per-field — changing one flag re-renders only the parts that select it.
type LayoutState = {
  closableTabs: boolean;
  dispatch: (action: Action) => void;
  draggableTabs: boolean;
  draggableTabsets: boolean;
  editable: boolean;
  keepMounted: boolean;
  maximizable: boolean;
  maximizedTabsetId: string | undefined;
  renamableTabs: boolean;
  renderTab: (tab: TabNode) => ReactNode;
  renderTabLabel: ((tab: TabNode) => ReactNode) | undefined;
  renderTabsetToolbar: ((tabset: TabsetNode) => ReactNode) | undefined;
  resizableSplits: boolean;
  splitDock: boolean;
  tabLocation: "bottom" | "top";
  tabsetMinSize: number;
  tabStripEnabled: boolean;
};

type LayoutStore = StoreApi<LayoutState>;

const createLayoutStore = (initial: LayoutState): LayoutStore =>
  createStore<LayoutState>(() => initial);

// Carries only the store instance — state always flows through selectors.
const LayoutStoreContext = createContext<LayoutStore | null>(null);

const useLayout = <T>(selector: (state: LayoutState) => T): T => {
  const store = useContext(LayoutStoreContext);
  if (store === null) {
    throw new Error("dashfoo components must be rendered inside <DashfooLayout> or <Layout.Root>.");
  }
  return useStore(store, selector);
};

export { createLayoutStore, LayoutStoreContext, useLayout };
export type { LayoutState, LayoutStore };

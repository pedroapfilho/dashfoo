"use client";

import type { Action, SnapConfig, TabNode, TabsetNode } from "@dashfoo/core";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { createStore, useStore } from "zustand";

type LayoutState = {
  closableTabs: boolean;
  dispatch: (action: Action) => void;
  draggableTabs: boolean;
  draggableTabsets: boolean;
  editable: boolean;

  floatable: boolean;
  keepMounted: boolean;
  maximizable: boolean;
  maximizedTabsetId: string | undefined;
  renamableTabs: boolean;
  renderTab: (tab: TabNode) => ReactNode;
  renderTabLabel: ((tab: TabNode) => ReactNode) | undefined;
  renderTabsetToolbar: ((tabset: TabsetNode) => ReactNode) | undefined;
  resizableSplits: boolean;

  snap: SnapConfig | null;
  splitDock: boolean;
  tabLocation: "bottom" | "top";
  tabsetMinSize: number;
  tabStripEnabled: boolean;
};

type LayoutStore = StoreApi<LayoutState>;

const createLayoutStore = (initial: LayoutState): LayoutStore =>
  createStore<LayoutState>(() => initial);

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

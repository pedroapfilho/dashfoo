"use client";

import type {
  Action,
  Dashfoo,
  SelectOnRemove,
  SnapConfig,
  TabNode,
  TabsetNode,
} from "@dashfoo/core";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { createStore, useStore } from "zustand";

import type { DragGroupScope } from "../drag/drag-group";
import type { TearOffHandler } from "../drag/tear-off";
import type { TablistSpace } from "../tabset/tablist-space";

type LayoutState = {
  canDock: boolean;
  closableTabs: boolean;
  dispatch: (action: Action) => void;
  documentId: string;
  draggableTabs: boolean;
  draggableTabsets: boolean;
  dragGroup: string | undefined;
  dragGroupScope: DragGroupScope;
  edgeDocking: boolean;
  editable: boolean;

  floatable: boolean;
  keepMounted: boolean | "activity";
  maximizable: boolean;
  maximizedTabsetId: string | undefined;
  onTearOff: TearOffHandler | undefined;
  renamableTabs: boolean;
  renderTab: (tab: TabNode) => ReactNode;
  renderTabLabel: ((tab: TabNode) => ReactNode) | undefined;
  renderTabsetToolbar: ((tabset: TabsetNode) => ReactNode) | undefined;
  resizableSplits: boolean;
  selectOnRemove: SelectOnRemove;

  snap: SnapConfig | null;
  splitDock: boolean;
  tablistSpace: TablistSpace;
  tabLocation: "bottom" | "top";
  tabsetMinSize: number;
  tabStripEnabled: boolean;
};

/** What the library reads and a host does not, kept apart so the published `LayoutState` does not grow with it. */
type LayoutInternals = LayoutState & { model: Dashfoo };

type LayoutStore = StoreApi<LayoutInternals>;

const createLayoutStore = (initial: LayoutInternals): LayoutStore =>
  createStore<LayoutInternals>(() => initial);

const LayoutStoreContext = createContext<LayoutStore | null>(null);

const useLayoutInternals = <T>(selector: (state: LayoutInternals) => T): T => {
  const store = useContext(LayoutStoreContext);

  if (store === null) {
    throw new Error("dashfoo components must be rendered inside <DashfooLayout> or <Layout.Root>.");
  }

  return useStore(store, selector);
};

const useLayout: <T>(selector: (state: LayoutState) => T) => T = useLayoutInternals;

export { createLayoutStore, LayoutStoreContext, useLayout, useLayoutInternals };

export type { LayoutInternals, LayoutState, LayoutStore };

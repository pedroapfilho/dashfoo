"use client";

import type { Action, TabNode, TabsetNode } from "@dashfoo/core";
import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { createStore, useStore } from "zustand";

import { tabDomId } from "../../lib/tab-ids";
import { warnOnce } from "../../lib/warn-once";
import type { OverflowItem } from "../tab-overflow-menu";

type TabsetState = {
  activeTab: TabNode | undefined;
  cancelRename: () => void;
  closeTab: (tabId: string) => void;
  commitRename: (tabId: string, value: string) => void;
  dispatch: (action: Action) => void;
  editingTabId: string | null;
  isMaximized: boolean;
  node: TabsetNode;
  overflowItems: Array<OverflowItem>;
  registerRenameInput: () => () => void;
  registerTablist: (element: HTMLDivElement | null) => void;
  renameInputCount: number;
  renameTab: (tabId: string, name: string) => void;
  restoreFocus: boolean;
  selectOverflowTab: (tabId: string) => void;
  selectTab: (index: number, options?: { focus?: boolean }) => void;
  showMaximize: boolean;
  startEditing: (tabId: string) => void;
  tablistElement: HTMLDivElement | null;
  tabsClosable: boolean;
  tabsRenamable: boolean;
  toggleMaximize: () => void;
  visualSelected: number;
};

type TabsetStore = StoreApi<TabsetState>;

type TabsetSnapshot = Pick<
  TabsetState,
  | "activeTab"
  | "dispatch"
  | "isMaximized"
  | "node"
  | "showMaximize"
  | "tabsClosable"
  | "tabsRenamable"
  | "visualSelected"
>;

const tabButtonIn = (
  scope: HTMLElement | null,
  tabsetId: string,
  tabId: string,
): HTMLElement | null =>
  scope?.querySelector<HTMLElement>(`#${CSS.escape(tabDomId(tabsetId, tabId))}`) ?? null;

const createTabsetStore = (initial: TabsetSnapshot): TabsetStore =>
  createStore<TabsetState>((set, get) => ({
    ...initial,
    cancelRename: () => {
      set({ editingTabId: null });
    },
    closeTab: (tabId) => {
      set({ restoreFocus: true });
      get().dispatch({ tabId, type: "deleteTab" });
    },
    commitRename: (tabId, value) => {
      set({ editingTabId: null });
      const { node, renameTab } = get();
      const trimmed = value.trim();
      const current = node.children.find((tab) => tab.id === tabId)?.name;
      if (trimmed && trimmed !== current) {
        renameTab(tabId, trimmed);
      }
    },
    editingTabId: null,
    overflowItems: [],
    registerRenameInput: () => {
      set((state) => ({ renameInputCount: state.renameInputCount + 1 }));
      return () => {
        set((state) => ({ renameInputCount: state.renameInputCount - 1 }));
      };
    },
    registerTablist: (element) => {
      if (element) {
        const current = get().tablistElement;
        if (current && current !== element) {
          warnOnce(
            `duplicate-tablist-${get().node.id}`,
            "more than one <Tabset.Tablist> under the same <Tabset.Root>; the last one wins for keyboard focus and overflow",
          );
        }
        set({ tablistElement: element });
        return;
      }
      set({ tablistElement: null });
    },
    renameInputCount: 0,
    renameTab: (tabId, name) => {
      get().dispatch({ name, tabId, type: "renameTab" });
    },
    restoreFocus: false,
    selectOverflowTab: (tabId) => {
      const { dispatch, node, tablistElement } = get();
      const index = node.children.findIndex((tab) => tab.id === tabId);
      if (index === -1) {
        return;
      }
      dispatch({ index, tabsetId: node.id, type: "selectTab" });
      tabButtonIn(tablistElement, node.id, tabId)?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    },
    selectTab: (index, options) => {
      const { dispatch, node, tablistElement } = get();
      dispatch({ index, tabsetId: node.id, type: "selectTab" });
      if (options?.focus === true) {
        const tabId = node.children[index]?.id;
        if (tabId) {
          tabButtonIn(tablistElement, node.id, tabId)?.focus();
        }
      }
    },
    startEditing: (tabId) => {
      const { node, renameInputCount, tabsRenamable } = get();
      const tab = node.children.find((child) => child.id === tabId);
      if (!tabsRenamable || tab?.enableRename === false) {
        return;
      }
      if (renameInputCount === 0) {
        warnOnce(
          `missing-rename-input-${node.id}`,
          "startEditing needs a <Tabset.RenameInput> in the composition; ignoring",
        );
        return;
      }
      set({ editingTabId: tabId });
    },
    tablistElement: null,
    toggleMaximize: () => {
      const { dispatch, isMaximized, node } = get();
      dispatch({ tabsetId: isMaximized ? null : node.id, type: "setMaximizedTabset" });
    },
  }));

const TabsetStoreContext = createContext<TabsetStore | null>(null);

const useTabset = <T>(selector: (state: TabsetState) => T): T => {
  const store = useContext(TabsetStoreContext);
  if (store === null) {
    throw new Error("dashfoo Tabset parts must be rendered inside <Tabset.Root>.");
  }
  return useStore(store, selector);
};

type TabContextValue = { index: number; tab: TabNode };

const TabContext = createContext<TabContextValue | null>(null);

const useTab = (): TabContextValue => {
  const value = useContext(TabContext);
  if (value === null) {
    throw new Error("dashfoo tab parts must be rendered inside <Tabset.Tab>.");
  }
  return value;
};

export { createTabsetStore, TabContext, TabsetStoreContext, useTab, useTabset };
export type { TabContextValue, TabsetSnapshot, TabsetState, TabsetStore };

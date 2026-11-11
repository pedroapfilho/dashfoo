"use client";

import type { Action, TabNode, TabsetNode } from "@dashfoo/core";
import { warnOnce } from "@dashfoo/core";
import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { createStore, useStore } from "zustand";

import { findTabButton } from "../lib/dom-ids";

type OverflowItem = { id: string; name: string };

type TabsetState = {
  activeTab: TabNode | undefined;
  closeTab: (tabId: string) => void;
  dispatch: (action: Action) => void;
  documentId: string;
  editingTabId: string | null;
  isMaximized: boolean;
  node: TabsetNode;
  overflowItems: Array<OverflowItem>;
  /** The tab a `closeTab` is waiting on, so a vetoed close cannot restore focus. */
  pendingCloseTabId: string | null;
  registerRenameInput: () => () => void;
  registerTablist: (element: HTMLDivElement | null) => void;
  renameInputCount: number;
  renameTab: (tabId: string, name: string) => void;
  selectOverflowTab: (tabId: string) => void;
  selectTab: (index: number, options?: { focus?: boolean }) => void;
  showMaximize: boolean;
  startEditing: (tabId: string) => void;
  stopEditing: () => void;
  tablistElement: HTMLDivElement | null;
  /** Layout pixels the tabs leave free in the tablist, negative once they overflow; `undefined` until measured. */
  tablistSpace: number | undefined;
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
  | "documentId"
  | "isMaximized"
  | "node"
  | "showMaximize"
  | "tabsClosable"
  | "tabsRenamable"
  | "visualSelected"
>;

const canCloseTab = (state: Pick<TabsetState, "tabsClosable">, tab: TabNode): boolean =>
  state.tabsClosable && tab.enableClose !== false;

const canRenameTab = (state: Pick<TabsetState, "tabsRenamable">, tab: TabNode): boolean =>
  state.tabsRenamable && tab.enableRename !== false;

const createTabsetStore = (initial: TabsetSnapshot): TabsetStore =>
  createStore<TabsetState>((set, get) => ({
    ...initial,
    closeTab: (tabId) => {
      set({ pendingCloseTabId: tabId });
      get().dispatch({ tabId, type: "deleteTab" });
    },
    editingTabId: null,
    overflowItems: [],
    pendingCloseTabId: null,
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
    selectOverflowTab: (tabId) => {
      const { dispatch, documentId, node, tablistElement } = get();
      const index = node.children.findIndex((tab) => tab.id === tabId);

      if (index === -1) {
        return;
      }

      dispatch({ index, tabsetId: node.id, type: "selectTab" });
      findTabButton(tablistElement, documentId, node.id, tabId)?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    },
    selectTab: (index, options) => {
      const { dispatch, documentId, node, tablistElement } = get();
      dispatch({ index, tabsetId: node.id, type: "selectTab" });

      if (options?.focus === true) {
        const tab = node.children[index];

        if (tab) {
          findTabButton(tablistElement, documentId, node.id, tab.id)?.focus();
        }
      }
    },
    startEditing: (tabId) => {
      const state = get();
      const tab = state.node.children.find((child) => child.id === tabId);

      if (!tab || !canRenameTab(state, tab)) {
        return;
      }

      if (state.renameInputCount === 0) {
        warnOnce(
          `missing-rename-input-${state.node.id}`,
          "startEditing needs a <Tabset.RenameInput> in the composition; ignoring",
        );

        return;
      }

      set({ editingTabId: tabId });
    },
    stopEditing: () => {
      set({ editingTabId: null });
    },
    tablistElement: null,
    tablistSpace: undefined,
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

/** The tab a part belongs to and what the user may do to it: the layout, tabset and tab flags combined. */
type TabContextValue = {
  closable: boolean;
  draggable: boolean;
  index: number;
  renamable: boolean;
  tab: TabNode;
};

const TabContext = createContext<TabContextValue | null>(null);

const useTab = (): TabContextValue => {
  const value = useContext(TabContext);

  if (value === null) {
    throw new Error("dashfoo tab parts must be rendered inside <Tabset.Tab>.");
  }

  return value;
};

export {
  canCloseTab,
  canRenameTab,
  createTabsetStore,
  TabContext,
  TabsetStoreContext,
  useTab,
  useTabset,
};

export type { OverflowItem, TabContextValue, TabsetSnapshot, TabsetState, TabsetStore };

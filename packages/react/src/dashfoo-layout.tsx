"use client";

import type { Action, Dashfoo, DockLocation, TabNode, TabsetNode } from "@dashfoo/core";
import { findTabset } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";
import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";

import { DashfooContext } from "./context";
import { DragProvider } from "./drag-adapter";
import { RowView } from "./row-view";
import { useDashfooStore } from "./store";
import { TabsetView } from "./tabset-view";

type TabComponent = ComponentType<{ node: TabNode }>;

// Component names already warned about, so the dev warning fires at most once each.
const warnedComponents = new Set<string>();

// Imperative API exposed via ref — lets a host drive the layout from a toolbar,
// command palette, or keyboard shortcuts without rebuilding the store's plumbing.
type DashfooHandle = {
  addTab: (
    tab: TabNode,
    target: { index?: number; location?: DockLocation; targetId: string },
  ) => void;
  canRedo: () => boolean;
  canUndo: () => boolean;
  closeTab: (tabId: string) => void;
  dispatch: (action: Action) => void;
  getModel: () => Dashfoo;
  maximizeTabset: (tabsetId: string | null) => void;
  redo: () => void;
  renameTab: (tabId: string, name: string) => void;
  selectTab: (tabsetId: string, index: number) => void;
  undo: () => void;
};

type DashfooLayoutProps = {
  closableTabs?: boolean;
  components?: Record<string, TabComponent>;
  defaultModel?: Dashfoo;
  draggableTabsets?: boolean;
  factory?: (tab: TabNode) => ReactNode;
  keepMounted?: boolean;
  maximizable?: boolean;
  model?: Dashfoo;
  onAction?: (action: Action) => Action | null;
  onActiveTabsetChange?: (tabsetId: string | undefined) => void;
  onMaximizedTabsetChange?: (tabsetId: string | undefined) => void;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
  renamableTabs?: boolean;
  renderTabLabel?: (tab: TabNode) => ReactNode;
  renderTabsetToolbar?: (tabset: TabsetNode) => ReactNode;
};

const rootStyle = { display: "flex", height: "100%", width: "100%" } as const;

// The top-level component. Owns the store (controlled or uncontrolled), resolves
// tab content via a components registry or a factory, and renders the layout tree.
// forwardRef (not the React 19 ref-as-prop) keeps the React 18 peer working.
const DashfooLayout = forwardRef<DashfooHandle, DashfooLayoutProps>((props, ref): ReactNode => {
  const {
    closableTabs = true,
    components,
    defaultModel,
    draggableTabsets = true,
    factory,
    keepMounted = false,
    maximizable = true,
    model,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange,
    renamableTabs = true,
    renderTabLabel,
    renderTabsetToolbar,
  } = props;
  const store = useDashfooStore({
    defaultModel,
    model,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange,
  });

  useImperativeHandle(
    ref,
    () => ({
      addTab: (tab, target) =>
        store.dispatch({
          index: target.index,
          location: target.location ?? "center",
          tab,
          targetId: target.targetId,
          type: "addNode",
        }),
      canRedo: store.canRedo,
      canUndo: store.canUndo,
      closeTab: (tabId) => store.dispatch({ tabId, type: "deleteTab" }),
      dispatch: store.dispatch,
      getModel: () => store.model,
      maximizeTabset: (tabsetId) => store.dispatch({ tabsetId, type: "setMaximizedTabset" }),
      redo: store.redo,
      renameTab: (tabId, name) => store.dispatch({ name, tabId, type: "renameTab" }),
      selectTab: (tabsetId, index) => store.dispatch({ index, tabsetId, type: "selectTab" }),
      undo: store.undo,
    }),
    [store],
  );

  const renderTab = useCallback(
    (tab: TabNode): ReactNode => {
      if (factory) {
        return factory(tab);
      }
      const Component = components?.[tab.component];
      if (!Component) {
        if (components && !warnedComponents.has(tab.component)) {
          warnedComponents.add(tab.component);
          // A tab whose component is not registered renders nothing — surface it
          // once so the misconfiguration is not silent.
          // oxlint-disable-next-line no-console
          console.warn(`[dashfoo] no component registered for "${tab.component}"`);
        }
        return null;
      }
      return <Component node={tab} />;
    },
    [components, factory],
  );

  // Model-level globals act as a default layer under the component props: a
  // feature is on unless the prop, the global, or the per-node flag turns it off.
  const global = store.model.global;
  const effectiveClosable = closableTabs && global.tabEnableClose !== false;
  const effectiveRenamable = renamableTabs && global.tabEnableRename !== false;
  const effectiveMaximizable = maximizable && global.tabSetEnableMaximize !== false;
  const tabLocation = global.tabLocation ?? "top";
  const tabStripEnabled = global.tabSetEnableTabStrip !== false;

  const contextValue = useMemo(
    () => ({
      closableTabs: effectiveClosable,
      dispatch: store.dispatch,
      draggableTabsets,
      keepMounted,
      maximizable: effectiveMaximizable,
      maximizedTabsetId: store.model.maximizedTabsetId,
      renamableTabs: effectiveRenamable,
      renderTab,
      renderTabLabel,
      renderTabsetToolbar,
      tabLocation,
      tabStripEnabled,
    }),
    [
      draggableTabsets,
      effectiveClosable,
      effectiveMaximizable,
      effectiveRenamable,
      keepMounted,
      renderTab,
      renderTabLabel,
      renderTabsetToolbar,
      store.dispatch,
      store.model.maximizedTabsetId,
      tabLocation,
      tabStripEnabled,
    ],
  );

  const handleCommit = store.dispatch;
  const splitDock = global.enableSplitDock !== false;

  // A maximized tabset fills the frame on its own; otherwise the row tree renders.
  const maximized = store.model.maximizedTabsetId
    ? findTabset(store.model, store.model.maximizedTabsetId)
    : undefined;

  return (
    <DashfooContext.Provider value={contextValue}>
      <DragProvider onCommit={handleCommit} splitDock={splitDock}>
        <div data-dashfoo="layout" style={rootStyle}>
          {maximized ? <TabsetView node={maximized} /> : <RowView node={store.model.layout} />}
        </div>
      </DragProvider>
    </DashfooContext.Provider>
  );
});

DashfooLayout.displayName = "DashfooLayout";

export { DashfooLayout };
export type { DashfooHandle, DashfooLayoutProps, TabComponent };

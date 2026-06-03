"use client";

import type { Action, Dashfoo, DockLocation, TabNode } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";
import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";

import { DashfooContext } from "./context";
import { DragProvider } from "./drag-adapter";
import { LayoutFrame } from "./layout-frame";
import { useDashfooStore } from "./store";

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
  factory?: (tab: TabNode) => ReactNode;
  maximizable?: boolean;
  model?: Dashfoo;
  onAction?: (action: Action) => Action | null;
  onActiveTabsetChange?: (tabsetId: string | undefined) => void;
  onMaximizedTabsetChange?: (tabsetId: string | undefined) => void;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
  renamableTabs?: boolean;
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
    factory,
    maximizable = true,
    model,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange,
    renamableTabs = true,
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
      canRedo: () => store.canRedo,
      canUndo: () => store.canUndo,
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

  const contextValue = useMemo(
    () => ({
      closableTabs,
      dispatch: store.dispatch,
      maximizable,
      maximizedTabsetId: store.model.maximizedTabsetId,
      renamableTabs,
      renderTab,
    }),
    [
      closableTabs,
      maximizable,
      renamableTabs,
      renderTab,
      store.dispatch,
      store.model.maximizedTabsetId,
    ],
  );

  const handleCommit = store.dispatch;
  const borderDock = store.model.global.enableBorderDock !== false;
  const splitDock = store.model.global.enableSplitDock !== false;

  return (
    <DashfooContext.Provider value={contextValue}>
      <DragProvider borderDock={borderDock} onCommit={handleCommit} splitDock={splitDock}>
        <div data-dashfoo="layout" style={rootStyle}>
          <LayoutFrame model={store.model} />
        </div>
      </DragProvider>
    </DashfooContext.Provider>
  );
});

DashfooLayout.displayName = "DashfooLayout";

export { DashfooLayout };
export type { DashfooHandle, DashfooLayoutProps, TabComponent };

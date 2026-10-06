"use client";

import type { Action, Dashfoo, DockLocation, SnapConfig, TabNode, TabsetNode } from "@dashfoo/core";
import { findTabset } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";
import { forwardRef, useCallback, useContext, useImperativeHandle, useMemo } from "react";

import { SharedDragManagerContext } from "../hooks/drag-hooks";
import type { PersistInput } from "../hooks/persistence";
import type { ResponsiveOptions } from "../hooks/responsive";
import { useResponsiveLayout } from "../hooks/responsive";
import { useDashfooStore } from "../hooks/store";

import { DashfooDragProvider } from "./dashfoo-drag-provider";
import { Layout } from "./layout";

type TabComponent = ComponentType<{ node: TabNode }>;

const warnedComponents = new Set<string>();

type DashfooHandle = {
  addTab: (
    tab: TabNode,
    target: { index?: number; location?: DockLocation; targetId: string },
  ) => void;
  canRedo: () => boolean;
  canUndo: () => boolean;
  closeTab: (tabId: string) => void;
  dispatch: (action: Action) => void;

  dockFloat: (floatId: string) => void;

  floatTab: (tabId: string) => void;
  getModel: () => Dashfoo;
  maximizeTabset: (tabsetId: string | null) => void;
  redo: () => void;
  renameTab: (tabId: string, name: string) => void;

  resetLayout: () => void;
  selectTab: (tabsetId: string, index: number) => void;
  undo: () => void;
};

type DashfooLayoutCommonProps = {
  closableTabs?: boolean;
  components?: Record<string, TabComponent>;
  draggableTabs?: boolean;
  draggableTabsets?: boolean;

  editable?: boolean;
  factory?: (tab: TabNode) => ReactNode;

  floatable?: boolean;
  keepMounted?: boolean;
  maximizable?: boolean;
  onAction?: (action: Action) => Action | null;
  onActiveTabsetChange?: (tabsetId: string | undefined) => void;
  onMaximizedTabsetChange?: (tabsetId: string | undefined) => void;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
  renamableTabs?: boolean;
  renderTabLabel?: (tab: TabNode) => ReactNode;
  renderTabsetToolbar?: (tabset: TabsetNode) => ReactNode;

  resizableSplits?: boolean;
  responsive?: ResponsiveOptions;

  snap?: SnapConfig;
};

type DashfooLayoutProps = DashfooLayoutCommonProps &
  (
    | { defaultModel: Dashfoo; model?: never; persist?: PersistInput }
    | { defaultModel?: never; model: Dashfoo; persist?: never }
  );

const DashfooLayout = forwardRef<DashfooHandle, DashfooLayoutProps>((props, ref): ReactNode => {
  const {
    closableTabs = true,
    components,
    defaultModel,
    draggableTabs = true,
    draggableTabsets = true,
    editable = true,
    factory,
    floatable = false,
    keepMounted = false,
    maximizable = true,
    model,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange,
    persist,
    renamableTabs = true,
    renderTabLabel,
    renderTabsetToolbar,
    resizableSplits = true,
    responsive,
    snap,
  } = props;

  const store = useDashfooStore({
    defaultModel,
    model,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange,
    persist,
  });

  const hasSharedManager = useContext(SharedDragManagerContext) !== null;

  useImperativeHandle(
    ref,
    () => ({
      addTab: (tab, target) => {
        store.dispatch({
          index: target.index,
          location: target.location ?? "center",
          tab,
          targetId: target.targetId,
          type: "addNode",
        });
      },
      canRedo: store.canRedo,
      canUndo: store.canUndo,
      closeTab: (tabId) => {
        store.dispatch({ tabId, type: "deleteTab" });
      },
      dispatch: store.dispatch,
      dockFloat: (floatId) => {
        store.dispatch({ floatId, type: "dockFloat" });
      },
      floatTab: (tabId) => {
        store.dispatch({ tabId, type: "floatTab" });
      },
      getModel: () => store.model,
      maximizeTabset: (tabsetId) => {
        store.dispatch({ tabsetId, type: "setMaximizedTabset" });
      },
      redo: store.redo,
      renameTab: (tabId, name) => {
        store.dispatch({ name, tabId, type: "renameTab" });
      },
      resetLayout: store.reset,
      selectTab: (tabsetId, index) => {
        store.dispatch({ index, tabsetId, type: "selectTab" });
      },
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

          // oxlint-disable-next-line no-console -- dashfoo reports degraded paths on the developer console instead of failing silently
          console.warn(`[dashfoo] no component registered for "${tab.component}"`);
        }
        return null;
      }
      return <Component node={tab} />;
    },
    [components, factory],
  );
  const renderers = useMemo(
    () => ({ tab: renderTab, tabLabel: renderTabLabel, tabsetToolbar: renderTabsetToolbar }),
    [renderTab, renderTabLabel, renderTabsetToolbar],
  );

  const presentation = useResponsiveLayout(store.model, responsive);
  const view = presentation.model;

  const maximized =
    view.maximizedTabsetId === undefined ? undefined : findTabset(view, view.maximizedTabsetId);

  const tree = (
    <Layout.FloatLayer floats={view.floats}>
      <Layout.DragLayer>
        {maximized ? <Layout.Tabset node={maximized} /> : <Layout.Rows node={view.layout} />}
      </Layout.DragLayer>
    </Layout.FloatLayer>
  );

  return (
    <Layout.Root
      closableTabs={closableTabs}
      dispatch={store.dispatch}
      draggableTabs={draggableTabs}
      draggableTabsets={draggableTabsets}
      editable={editable}
      floatable={floatable}
      keepMounted={keepMounted}
      maximizable={maximizable && presentation.maximizable}
      model={view}
      renamableTabs={renamableTabs}
      renderers={renderers}
      resizableSplits={resizableSplits}
      restructurable={presentation.restructurable}
      rootRef={presentation.rootRef}
      snap={snap}
    >
      {hasSharedManager ? tree : <DashfooDragProvider>{tree}</DashfooDragProvider>}
    </Layout.Root>
  );
});

DashfooLayout.displayName = "DashfooLayout";

export { DashfooLayout };
export type { DashfooHandle, DashfooLayoutCommonProps, DashfooLayoutProps, TabComponent };

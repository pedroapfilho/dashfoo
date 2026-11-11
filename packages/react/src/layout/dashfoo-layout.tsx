"use client";

import type { Action, Dashfoo, DockLocation, TabNode, TabsetNode } from "@dashfoo/core";
import { warnOnce } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";
import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";

import type { PersistInput } from "../store/persistence";
import { useDashfooStore } from "../store/store";

import { Layout } from "./layout";
import type { LayoutOptions } from "./layout-root";
import type { ResponsiveOptions } from "./responsive";
import { useResponsiveLayout } from "./responsive";

type TabComponent = ComponentType<{ node: TabNode }>;

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
  floatTabset: (tabsetId: string) => void;
  getModel: () => Dashfoo;
  maximizeTabset: (tabsetId: string | null) => void;
  redo: () => void;
  renameTab: (tabId: string, name: string) => void;

  resetLayout: () => void;
  selectTab: (tabsetId: string, index: number) => void;
  setFloatMinimized: (floatId: string, minimized: boolean) => void;
  undo: () => void;
};

type DashfooLayoutCommonProps = LayoutOptions & {
  components?: Record<string, TabComponent>;
  factory?: (tab: TabNode) => ReactNode;
  onAction?: (action: Action) => Action | null;
  onActiveTabsetChange?: (tabsetId: string | undefined) => void;
  onMaximizedTabsetChange?: (tabsetId: string | undefined) => void;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
  renderTabLabel?: (tab: TabNode) => ReactNode;
  renderTabsetToolbar?: (tabset: TabsetNode) => ReactNode;
  responsive?: ResponsiveOptions;
};

type DashfooLayoutProps = DashfooLayoutCommonProps &
  (
    | { defaultModel: Dashfoo; model?: never; persist?: PersistInput }
    | { defaultModel?: never; model: Dashfoo; persist?: never }
  );

const DashfooLayout = forwardRef<DashfooHandle, DashfooLayoutProps>((props, ref): ReactNode => {
  const {
    components,
    defaultModel,
    factory,
    model,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange,
    persist,
    renderTabLabel,
    renderTabsetToolbar,
    responsive,
    ...options
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
      floatTabset: (tabsetId) => {
        store.dispatch({ tabsetId, type: "floatTabset" });
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
      setFloatMinimized: (floatId, minimized) => {
        store.dispatch({ floatId, minimized, type: "setFloatMinimized" });
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
        warnOnce(
          `unregistered-component:${tab.component}`,
          `no component registered for "${tab.component}"; pass it in \`components\` or render tabs with \`factory\``,
        );

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

  const tree = (
    <Layout.FloatLayer floats={view.floats}>
      <Layout.DragLayer>
        <Layout.Rows node={view.layout} />
      </Layout.DragLayer>
    </Layout.FloatLayer>
  );

  return (
    <Layout.Root
      {...options}
      {...presentation.locks}
      dispatch={store.dispatch}
      model={view}
      renderers={renderers}
      rootRef={presentation.rootRef}
    >
      {tree}
    </Layout.Root>
  );
});

DashfooLayout.displayName = "DashfooLayout";

export { DashfooLayout };

export type { DashfooHandle, DashfooLayoutCommonProps, DashfooLayoutProps, TabComponent };

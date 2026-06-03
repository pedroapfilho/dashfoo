"use client";

import type { Action, Dashfoo, TabNode } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";
import { useCallback, useMemo } from "react";

import { DashfooContext } from "./context";
import { DragProvider } from "./drag-adapter";
import { LayoutFrame } from "./layout-frame";
import { useDashfooStore } from "./store";

type TabComponent = ComponentType<{ node: TabNode }>;

type DashfooLayoutProps = {
  closableTabs?: boolean;
  components?: Record<string, TabComponent>;
  defaultModel?: Dashfoo;
  factory?: (tab: TabNode) => ReactNode;
  maximizable?: boolean;
  model?: Dashfoo;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
  renamableTabs?: boolean;
};

const rootStyle = { display: "flex", height: "100%", width: "100%" } as const;

// The top-level component. Owns the store (controlled or uncontrolled), resolves
// tab content via a components registry or a factory, and renders the layout tree.
const DashfooLayout = (props: DashfooLayoutProps): ReactNode => {
  const {
    closableTabs = true,
    components,
    defaultModel,
    factory,
    maximizable = true,
    model,
    onModelChange,
    renamableTabs = true,
  } = props;
  const store = useDashfooStore({ defaultModel, model, onModelChange });

  const renderTab = useCallback(
    (tab: TabNode): ReactNode => {
      if (factory) {
        return factory(tab);
      }
      const Component = components?.[tab.component];
      return Component ? <Component node={tab} /> : null;
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

  return (
    <DashfooContext.Provider value={contextValue}>
      <DragProvider onCommit={handleCommit}>
        <div data-dashfoo="layout" style={rootStyle}>
          <LayoutFrame model={store.model} />
        </div>
      </DragProvider>
    </DashfooContext.Provider>
  );
};

export { DashfooLayout };
export type { DashfooLayoutProps, TabComponent };

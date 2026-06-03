"use client";

import type { Action, Dashfoo, TabNode } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";
import { useCallback, useMemo } from "react";

import { DashfooContext } from "./context";
import { DragProvider } from "./drag-adapter";
import { LayoutFrame } from "./layout-frame";
import { useDashfooStore } from "./store";

type TabComponent = ComponentType<{ node: TabNode }>;

// Component names already warned about, so the dev warning fires at most once each.
const warnedComponents = new Set<string>();

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
};

export { DashfooLayout };
export type { DashfooLayoutProps, TabComponent };

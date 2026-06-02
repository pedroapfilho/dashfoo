"use client";

import type { Action, Dashfoo, TabNode } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";
import { useCallback, useMemo } from "react";

import { DashfooContext } from "./context";
import { DragProvider } from "./drag-adapter";
import { RowView } from "./row-view";
import { useDashfooStore } from "./store";

type TabComponent = ComponentType<{ node: TabNode }>;

type DashfooLayoutProps = {
  components?: Record<string, TabComponent>;
  defaultModel?: Dashfoo;
  factory?: (tab: TabNode) => ReactNode;
  model?: Dashfoo;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
};

const rootStyle = { display: "flex", height: "100%", width: "100%" } as const;

// The top-level component. Owns the store (controlled or uncontrolled), resolves
// tab content via a components registry or a factory, and renders the layout tree.
const DashfooLayout = (props: DashfooLayoutProps): ReactNode => {
  const { components, defaultModel, factory, model, onModelChange } = props;
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
    () => ({ dispatch: store.dispatch, renderTab }),
    [store.dispatch, renderTab],
  );

  const handleCommit = store.dispatch;

  return (
    <DashfooContext.Provider value={contextValue}>
      <DragProvider onCommit={handleCommit}>
        <div data-dashfoo="layout" style={rootStyle}>
          <RowView node={store.model.layout} />
        </div>
      </DragProvider>
    </DashfooContext.Provider>
  );
};

export { DashfooLayout };
export type { DashfooLayoutProps, TabComponent };

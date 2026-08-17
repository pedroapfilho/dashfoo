"use client";

import type { Action, Dashfoo, SnapConfig, TabNode, TabsetNode } from "@dashfoo/core";
import type { ComponentProps, CSSProperties, ReactNode, Ref } from "react";
import { useLayoutEffect, useState } from "react";

import type { LayoutState } from "../hooks/layout-store";
import { createLayoutStore, LayoutStoreContext, useLayout } from "../hooks/layout-store";

const DEFAULT_TABSET_MIN_SIZE = 320;

const rootStyle = { display: "flex", height: "100%", position: "relative", width: "100%" } as const;

type LayoutRootProps = Omit<ComponentProps<"div">, "children"> & {
  children: ReactNode;
  closableTabs?: boolean;
  dispatch: (action: Action) => void;
  draggableTabs?: boolean;
  draggableTabsets?: boolean;

  editable?: boolean;

  floatable?: boolean;
  keepMounted?: boolean;
  maximizable?: boolean;
  model: Dashfoo;
  renamableTabs?: boolean;
  renderTab: (tab: TabNode) => ReactNode;
  renderTabLabel?: (tab: TabNode) => ReactNode;
  renderTabsetToolbar?: (tabset: TabsetNode) => ReactNode;
  resizableSplits?: boolean;

  /** When false, the tree itself is frozen: no dragging, splitting or floating. Tabs stay closable and renamable. */
  restructurable?: boolean;

  rootRef?: Ref<HTMLDivElement>;

  snap?: SnapConfig;
};

const LayoutRoot = ({
  children,
  closableTabs = true,
  dispatch,
  draggableTabs = true,
  draggableTabsets = true,
  editable = true,
  floatable = false,
  keepMounted = false,
  maximizable = true,
  model,
  renamableTabs = true,
  renderTab,
  renderTabLabel,
  renderTabsetToolbar,
  resizableSplits = true,
  restructurable = true,
  rootRef,
  snap,
  style,
  ...props
}: LayoutRootProps): ReactNode => {
  const global = model.global;
  const snapshot: LayoutState = {
    closableTabs: editable && closableTabs && global.tabEnableClose !== false,
    dispatch,
    draggableTabs: editable && restructurable && draggableTabs && global.tabEnableDrag !== false,
    draggableTabsets: editable && restructurable && draggableTabsets,
    editable,
    floatable: editable && restructurable && floatable,
    keepMounted,
    maximizable: maximizable && global.tabSetEnableMaximize !== false,
    maximizedTabsetId: model.maximizedTabsetId,
    renamableTabs: editable && renamableTabs && global.tabEnableRename !== false,
    renderTab,
    renderTabLabel,
    renderTabsetToolbar,
    resizableSplits:
      editable && restructurable && resizableSplits && global.enableSplitResize !== false,
    snap: snap ?? global.snap ?? null,
    splitDock: global.enableSplitDock !== false,
    tabLocation: global.tabLocation ?? "top",
    tabsetMinSize: global.tabSetMinSize ?? DEFAULT_TABSET_MIN_SIZE,
    tabStripEnabled: global.tabSetEnableTabStrip !== false,
  };

  const [store] = useState(() => createLayoutStore(snapshot));

  useLayoutEffect(() => {
    store.setState(snapshot);
  });

  const layoutStyle: CSSProperties =
    global.splitterSize === undefined
      ? { ...rootStyle, ...style }
      : ({
          ...rootStyle,
          "--dashfoo-splitter-size": `${global.splitterSize}px`,
          ...style,
        } as CSSProperties);

  return (
    <LayoutStoreContext.Provider value={store}>
      <div {...props} data-dashfoo="layout" ref={rootRef} style={layoutStyle}>
        {children}
      </div>
    </LayoutStoreContext.Provider>
  );
};

type LayoutOverridesProps = {
  children: ReactNode;
  overrides: Partial<LayoutState>;
};

/**
 * Republishes the parent store with overrides applied rather than re-deriving
 * flags, so anything the parent changes keeps flowing into the subtree.
 */
const LayoutOverrides = ({ children, overrides }: LayoutOverridesProps): ReactNode => {
  const parentState = useLayout((state) => state);
  const snapshot: LayoutState = { ...parentState, ...overrides };

  const [store] = useState(() => createLayoutStore(snapshot));

  useLayoutEffect(() => {
    store.setState(snapshot);
  });

  return (
    <LayoutStoreContext.Provider value={store}>
      <div data-dashfoo="layout" style={rootStyle}>
        {children}
      </div>
    </LayoutStoreContext.Provider>
  );
};

export { LayoutOverrides, LayoutRoot };
export type { LayoutOverridesProps, LayoutRootProps };

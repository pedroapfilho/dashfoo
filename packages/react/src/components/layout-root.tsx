"use client";

import type { Action, Dashfoo, TabNode, TabsetNode } from "@dashfoo/core";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useState } from "react";

import type { LayoutState } from "../hooks/layout-store";
import { createLayoutStore, LayoutStoreContext } from "../hooks/layout-store";

const DEFAULT_TABSET_MIN_SIZE = 320;

const rootStyle = { display: "flex", height: "100%", width: "100%" } as const;

type LayoutRootProps = Omit<ComponentProps<"div">, "children"> & {
  children: ReactNode;
  closableTabs?: boolean;
  dispatch: (action: Action) => void;
  draggableTabsets?: boolean;
  keepMounted?: boolean;
  maximizable?: boolean;
  model: Dashfoo;
  renamableTabs?: boolean;
  renderTab: (tab: TabNode) => ReactNode;
  renderTabLabel?: (tab: TabNode) => ReactNode;
  renderTabsetToolbar?: (tabset: TabsetNode) => ReactNode;
};

// The frame of a hand-built layout: creates the scoped layout store every part
// below subscribes to. Takes the model and dispatch (the two store fields the
// parts need) rather than a whole DashfooStore — wire useDashfooStore and pass
// store.model / store.dispatch.
const LayoutRoot = ({
  children,
  closableTabs = true,
  dispatch,
  draggableTabsets = true,
  keepMounted = false,
  maximizable = true,
  model,
  renamableTabs = true,
  renderTab,
  renderTabLabel,
  renderTabsetToolbar,
  style,
  ...props
}: LayoutRootProps): ReactNode => {
  // Model-level globals act as a default layer under the component props: a
  // feature is on unless the prop, the global, or the per-node flag turns it off.
  const global = model.global;
  const snapshot: LayoutState = {
    closableTabs: closableTabs && global.tabEnableClose !== false,
    dispatch,
    draggableTabsets,
    keepMounted,
    maximizable: maximizable && global.tabSetEnableMaximize !== false,
    maximizedTabsetId: model.maximizedTabsetId,
    renamableTabs: renamableTabs && global.tabEnableRename !== false,
    renderTab,
    renderTabLabel,
    renderTabsetToolbar,
    splitDock: global.enableSplitDock !== false,
    tabLocation: global.tabLocation ?? "top",
    tabsetMinSize: global.tabSetMinSize ?? DEFAULT_TABSET_MIN_SIZE,
    tabStripEnabled: global.tabSetEnableTabStrip !== false,
  };

  const [store] = useState(() => createLayoutStore(snapshot));
  // Props→store sync. useLayoutEffect so subscribers see fresh state before
  // paint; never during render — setState on an external store mid-render is
  // unsafe.
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
      <div {...props} data-dashfoo="layout" style={layoutStyle}>
        {children}
      </div>
    </LayoutStoreContext.Provider>
  );
};

export { LayoutRoot };
export type { LayoutRootProps };

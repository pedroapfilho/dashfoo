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
  draggableTabs?: boolean;
  draggableTabsets?: boolean;
  // The umbrella switch: false turns off every structural edit (tab/tabset drag,
  // close, rename, splitter resize, external drops) in one go, leaving view
  // interactions (tab selection, maximize, overflow) and dispatch untouched.
  editable?: boolean;
  keepMounted?: boolean;
  maximizable?: boolean;
  model: Dashfoo;
  renamableTabs?: boolean;
  renderTab: (tab: TabNode) => ReactNode;
  renderTabLabel?: (tab: TabNode) => ReactNode;
  renderTabsetToolbar?: (tabset: TabsetNode) => ReactNode;
  resizableSplits?: boolean;
};

// The frame of a hand-built layout: creates the scoped layout store every part
// below subscribes to. Takes the model and dispatch (the two store fields the
// parts need) rather than a whole DashfooStore — wire useDashfooStore and pass
// store.model / store.dispatch.
const LayoutRoot = ({
  children,
  closableTabs = true,
  dispatch,
  draggableTabs = true,
  draggableTabsets = true,
  editable = true,
  keepMounted = false,
  maximizable = true,
  model,
  renamableTabs = true,
  renderTab,
  renderTabLabel,
  renderTabsetToolbar,
  resizableSplits = true,
  style,
  ...props
}: LayoutRootProps): ReactNode => {
  // Model-level globals act as a default layer under the component props: a
  // feature is on unless the prop, the global, or the per-node flag turns it off.
  // `editable` is an extra AND-term over every structural capability — but not
  // maximize, which is reversible view state (same class as tab selection) and
  // stays available in a static layout.
  const global = model.global;
  const snapshot: LayoutState = {
    closableTabs: editable && closableTabs && global.tabEnableClose !== false,
    dispatch,
    draggableTabs: editable && draggableTabs && global.tabEnableDrag !== false,
    draggableTabsets: editable && draggableTabsets,
    editable,
    keepMounted,
    maximizable: maximizable && global.tabSetEnableMaximize !== false,
    maximizedTabsetId: model.maximizedTabsetId,
    renamableTabs: editable && renamableTabs && global.tabEnableRename !== false,
    renderTab,
    renderTabLabel,
    renderTabsetToolbar,
    resizableSplits: editable && resizableSplits && global.enableSplitResize !== false,
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

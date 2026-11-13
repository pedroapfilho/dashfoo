"use client";

import type { TabNode } from "@dashfoo/core";
import { warnOnce } from "@dashfoo/core/internal";
import type { ComponentProps, ReactNode } from "react";
import * as React from "react";
import { forwardRef } from "react";

import { useLayout } from "../layout/layout-store";
import { panelDomId, tabDomId } from "../lib/dom-ids";

import { useTabset } from "./tabset-store";

const TabPanel = ({
  render,
  tab,
}: {
  render?: (tab: TabNode) => ReactNode;
  tab: TabNode;
}): ReactNode => {
  const renderTab = useLayout((state) => state.renderTab);

  return render ? render(tab) : renderTab(tab);
};

/** `Activity` ships in React 19.2; the peer range still admits React 18. */
const ActivityBoundary = "Activity" in React ? React.Activity : undefined;

const RetainedTabPanel = ({
  activity,
  render,
  selected,
  tab,
}: {
  activity: boolean;
  render?: (tab: TabNode) => ReactNode;
  selected: boolean;
  tab: TabNode;
}): ReactNode => {
  const panel = <TabPanel render={render} tab={tab} />;

  if (!activity) {
    return panel;
  }

  if (!ActivityBoundary) {
    warnOnce(
      "activity-unsupported",
      'keepMounted="activity" needs React 19.2 or later; keeping inactive tabs mounted instead',
    );

    return panel;
  }

  return <ActivityBoundary mode={selected ? "visible" : "hidden"}>{panel}</ActivityBoundary>;
};

type TabsetContentProps = Omit<ComponentProps<"div">, "children"> & {
  children?: (tab: TabNode) => ReactNode;
};

const TabsetContent = forwardRef<HTMLDivElement, TabsetContentProps>(
  ({ children, style, ...props }, ref): ReactNode => {
    const node = useTabset((state) => state.node);
    const documentId = useTabset((state) => state.documentId);
    const editingTabId = useTabset((state) => state.editingTabId);
    const visualSelected = useTabset((state) => state.visualSelected);
    const keepMounted = useLayout((state) => state.keepMounted);

    const active: TabNode | undefined = node.children[visualSelected];
    const activeOnly = active ? [active] : [];
    const mounted = keepMounted === false ? activeOnly : node.children;

    if (mounted.length > 0) {
      return mounted.map((tab) => {
        const selected = tab === active;

        return (
          <div
            {...props}
            aria-label={editingTabId === tab.id ? tab.name : undefined}
            aria-labelledby={
              editingTabId === tab.id ? undefined : tabDomId(documentId, node.id, tab.id)
            }
            data-dashfoo="tabcontent"
            hidden={!selected || undefined}
            id={selected ? panelDomId(documentId, node.id) : undefined}
            key={keepMounted === false ? "active" : tab.id}
            ref={selected ? ref : undefined}
            role={selected ? "tabpanel" : undefined}
            style={style}
            tabIndex={selected ? 0 : undefined}
          >
            <RetainedTabPanel
              activity={keepMounted === "activity"}
              key={tab.id}
              render={children}
              selected={selected}
              tab={tab}
            />
          </div>
        );
      });
    }

    return <div {...props} data-dashfoo="tabcontent" ref={ref} style={style} />;
  },
);

TabsetContent.displayName = "TabsetContent";

export { TabsetContent };

export type { TabsetContentProps };

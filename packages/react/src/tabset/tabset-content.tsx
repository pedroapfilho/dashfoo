"use client";

import type { TabNode } from "@dashfoo/core";
import type { ComponentProps, ReactNode } from "react";
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
    const mounted = keepMounted ? node.children : activeOnly;

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
            key={keepMounted ? tab.id : "active"}
            ref={selected ? ref : undefined}
            role={selected ? "tabpanel" : undefined}
            style={style}
            tabIndex={selected ? 0 : undefined}
          >
            <TabPanel key={tab.id} render={children} tab={tab} />
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

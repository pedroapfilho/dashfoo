"use client";

import type { TabNode } from "@dashfoo/core";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { forwardRef } from "react";

import { useLayout } from "../../hooks/layout-store";
import { panelDomId, tabDomId } from "../../lib/tab-ids";

import { useTabset } from "./tabset-store";

const contentStyle: CSSProperties = { flex: 1, minHeight: 0, overflow: "auto" };

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
    const editingTabId = useTabset((state) => state.editingTabId);
    const visualSelected = useTabset((state) => state.visualSelected);
    const keepMounted = useLayout((state) => state.keepMounted);

    const mergedStyle = { ...contentStyle, ...style };

    if (keepMounted && node.children.length > 0) {
      return node.children.map((tab, index) => (
        <div
          {...props}
          aria-label={editingTabId === tab.id ? tab.name : undefined}
          aria-labelledby={editingTabId === tab.id ? undefined : tabDomId(node.id, tab.id)}
          data-dashfoo="tabcontent"
          hidden={index !== visualSelected || undefined}
          id={index === visualSelected ? panelDomId(node.id) : undefined}
          key={tab.id}
          ref={index === visualSelected ? ref : undefined}
          role={index === visualSelected ? "tabpanel" : undefined}
          style={mergedStyle}
          tabIndex={index === visualSelected ? 0 : undefined}
        >
          <TabPanel render={children} tab={tab} />
        </div>
      ));
    }

    const active = node.children[visualSelected];
    // oxlint-disable-next-line typescript/strict-boolean-expressions -- visualSelected is -1 while the tabset's only tab is dragged out, so this lookup really is undefined despite the non-optional type; `.at()` would wrongly resolve -1 to the last tab.
    if (active) {
      return (
        <div
          {...props}
          aria-label={editingTabId === active.id ? active.name : undefined}
          aria-labelledby={editingTabId === active.id ? undefined : tabDomId(node.id, active.id)}
          data-dashfoo="tabcontent"
          id={panelDomId(node.id)}
          ref={ref}
          role="tabpanel"
          style={mergedStyle}
          tabIndex={0}
        >
          <TabPanel render={children} tab={active} />
        </div>
      );
    }
    return <div {...props} data-dashfoo="tabcontent" ref={ref} style={mergedStyle} />;
  },
);

TabsetContent.displayName = "TabsetContent";

export { TabsetContent };
export type { TabsetContentProps };

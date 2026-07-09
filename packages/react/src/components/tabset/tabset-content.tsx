"use client";

import type { TabNode } from "@dashfoo/core";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

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

const TabsetContent = ({ children, style, ...props }: TabsetContentProps): ReactNode => {
  const node = useTabset((state) => state.node);
  const visualSelected = useTabset((state) => state.visualSelected);
  const keepMounted = useLayout((state) => state.keepMounted);

  const mergedStyle = { ...contentStyle, ...style };

  if (keepMounted && node.children.length > 0) {
    return node.children.map((tab, index) => (
      <div
        {...props}
        aria-labelledby={tabDomId(node.id, tab.id)}
        data-dashfoo="tabcontent"
        hidden={index !== visualSelected || undefined}
        id={index === visualSelected ? panelDomId(node.id) : undefined}
        key={tab.id}
        role={index === visualSelected ? "tabpanel" : undefined}
        style={mergedStyle}
        tabIndex={index === visualSelected ? 0 : undefined}
      >
        <TabPanel render={children} tab={tab} />
      </div>
    ));
  }

  const active = node.children[visualSelected];
  if (active) {
    return (
      <div
        {...props}
        aria-labelledby={tabDomId(node.id, active.id)}
        data-dashfoo="tabcontent"
        id={panelDomId(node.id)}
        role="tabpanel"
        style={mergedStyle}
        tabIndex={0}
      >
        <TabPanel render={children} tab={active} />
      </div>
    );
  }
  return <div {...props} data-dashfoo="tabcontent" style={mergedStyle} />;
};

export { TabsetContent };
export type { TabsetContentProps };

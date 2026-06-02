"use client";

import type { TabsetNode } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";

import { useDashfooContext } from "./context";

// height/width 100% (not flex:1) so the tabset fills its parent whether that
// parent is a flex item or a plain block — rrp wraps panel content in a block
// div, where flex:1 would collapse to content height.
const tabsetStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
};

const stripStyle: CSSProperties = { display: "flex", flexShrink: 0 };

const contentStyle: CSSProperties = { flex: 1, minHeight: 0, overflow: "auto" };

const TabsetView = ({ node }: { node: TabsetNode }): ReactNode => {
  const { dispatch, renderTab } = useDashfooContext();
  const active = node.children[node.selected];

  return (
    <div data-dashfoo="tabset" style={tabsetStyle}>
      <div data-dashfoo="tabstrip" role="tablist" style={stripStyle}>
        {node.children.map((tab, index) => (
          <button
            aria-selected={index === node.selected}
            data-dashfoo="tab"
            key={tab.id}
            onClick={() => {
              dispatch({ index, tabsetId: node.id, type: "selectTab" });
            }}
            role="tab"
            type="button"
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div data-dashfoo="tabcontent" role="tabpanel" style={contentStyle}>
        {active ? renderTab(active) : null}
      </div>
    </div>
  );
};

export { TabsetView };

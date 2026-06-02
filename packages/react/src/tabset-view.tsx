"use client";

import type { TabsetNode } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";

import { useDashfooContext } from "./context";

const tabsetStyle: CSSProperties = {
  display: "flex",
  flex: 1,
  flexDirection: "column",
  minHeight: 0,
  minWidth: 0,
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

"use client";

import type { TabNode, TabsetNode } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";

import { useDashfooContext } from "./context";
import { useTabDraggable, useTabsetDroppable } from "./drag-adapter";

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

// A single tab — its own component so the draggable hook isn't called in a loop.
const TabButton = ({
  index,
  selected,
  tab,
  tabsetId,
}: {
  index: number;
  selected: number;
  tab: TabNode;
  tabsetId: string;
}): ReactNode => {
  const { dispatch } = useDashfooContext();
  const { isDragging, ref } = useTabDraggable(tab.id);

  return (
    <button
      aria-selected={index === selected}
      data-dashfoo="tab"
      data-dragging={isDragging || undefined}
      onClick={() => {
        dispatch({ index, tabsetId, type: "selectTab" });
      }}
      ref={ref}
      role="tab"
      type="button"
    >
      {tab.name}
    </button>
  );
};

const TabsetView = ({ node }: { node: TabsetNode }): ReactNode => {
  const { renderTab } = useDashfooContext();
  const { isDropTarget, ref } = useTabsetDroppable(node.id);
  const active = node.children[node.selected];

  return (
    <div
      data-dashfoo="tabset"
      data-drop-target={isDropTarget || undefined}
      ref={ref}
      style={tabsetStyle}
    >
      <div data-dashfoo="tabstrip" role="tablist" style={stripStyle}>
        {node.children.map((tab, index) => (
          <TabButton
            index={index}
            key={tab.id}
            selected={node.selected}
            tab={tab}
            tabsetId={node.id}
          />
        ))}
      </div>
      <div data-dashfoo="tabcontent" role="tabpanel" style={contentStyle}>
        {active ? renderTab(active) : null}
      </div>
    </div>
  );
};

export { TabsetView };

"use client";

import type { TabNode, TabsetNode } from "@dashfoo/core";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

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

// The strip is a presentational row: the tablist (the actual tabs) plus room for
// a trailing toolbar. role="tablist" lives on the inner tablist so the toolbar is
// not announced as a tab.
const stripStyle: CSSProperties = { display: "flex", flexShrink: 0 };

const tablistStyle: CSSProperties = { display: "flex", minWidth: 0, overflow: "hidden" };

const contentStyle: CSSProperties = { flex: 1, minHeight: 0, overflow: "auto" };

const CloseIcon = (): ReactNode => (
  <svg aria-hidden="true" height="10" viewBox="0 0 10 10" width="10">
    <path d="M1.5 1.5l7 7m0-7l-7 7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
  </svg>
);

// A single tab — its own component so the draggable hook isn't called in a loop.
// The close control is a sibling button (not nested in the tab button, which
// would be invalid and would pollute the tab's accessible name).
const TabButton = ({
  closable,
  index,
  selected,
  tab,
  tabsetId,
}: {
  closable: boolean;
  index: number;
  selected: number;
  tab: TabNode;
  tabsetId: string;
}): ReactNode => {
  const { dispatch } = useDashfooContext();
  const { isDragging, ref } = useTabDraggable(tab.id);

  const handleSelect = (): void => {
    dispatch({ index, tabsetId, type: "selectTab" });
  };

  const handleClose = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    dispatch({ tabId: tab.id, type: "deleteTab" });
  };

  return (
    <span data-dashfoo="tab-item">
      <button
        aria-selected={index === selected}
        data-dashfoo="tab"
        data-dragging={isDragging || undefined}
        data-tab-id={tab.id}
        onClick={handleSelect}
        ref={ref}
        role="tab"
        type="button"
      >
        {tab.name}
      </button>
      {closable ? (
        <button
          aria-label={`Close ${tab.name}`}
          data-dashfoo="tab-close"
          onClick={handleClose}
          type="button"
        >
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
};

const TabsetView = ({ node }: { node: TabsetNode }): ReactNode => {
  const { closableTabs, renderTab } = useDashfooContext();
  const { isDropTarget, ref } = useTabsetDroppable(node.id);
  const active = node.children[node.selected];
  const tabsClosable = closableTabs && node.enableClose !== false;

  return (
    <div
      data-dashfoo="tabset"
      data-drop-target={isDropTarget || undefined}
      ref={ref}
      style={tabsetStyle}
    >
      <div data-dashfoo="tabstrip" style={stripStyle}>
        <div data-dashfoo="tablist" role="tablist" style={tablistStyle}>
          {node.children.map((tab, index) => (
            <TabButton
              closable={tabsClosable}
              index={index}
              key={tab.id}
              selected={node.selected}
              tab={tab}
              tabsetId={node.id}
            />
          ))}
        </div>
      </div>
      <div data-dashfoo="tabcontent" role="tabpanel" style={contentStyle}>
        {active ? renderTab(active) : null}
      </div>
    </div>
  );
};

export { TabsetView };

"use client";

import type { BorderNode, Dimension, Edge } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";

import { useDashfooContext } from "./context";

// Default drawer extent (width for left/right, height for top/bottom) when the
// model does not pin a size.
const DEFAULT_SIZE_PX = 240;

const isVertical = (edge: Edge): boolean => edge === "left" || edge === "right";

// The strip sits at the screen edge; the drawer opens toward the center.
const stripAtStart = (edge: Edge): boolean => edge === "left" || edge === "top";

const sizeToCss = (size: Dimension | undefined): string =>
  size ? `${size.value}${size.unit}` : `${DEFAULT_SIZE_PX}px`;

const stripStyle = (vertical: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: vertical ? "column" : "row",
  flexShrink: 0,
});

// A single border button — its own component so the click handler is named
// (jsx-handler-names) rather than an inline arrow inside the map.
const BorderTab = ({
  edge,
  index,
  selected,
  tab,
}: {
  edge: Edge;
  index: number;
  selected: number;
  tab: BorderNode["children"][number];
}): ReactNode => {
  const { dispatch } = useDashfooContext();

  const handleSelect = (): void => {
    // toggle: clicking the open tab collapses the drawer (-1).
    dispatch({ edge, index: selected === index ? -1 : index, type: "setBorderSelected" });
  };

  return (
    <button
      aria-pressed={index === selected}
      data-dashfoo="border-tab"
      onClick={handleSelect}
      type="button"
    >
      {tab.name}
    </button>
  );
};

// One frame edge: a strip of toggle buttons plus, when one is selected, a drawer
// rendering that tab's content. The strip hugs the screen edge; the drawer opens
// inward.
const BorderView = ({ node }: { node: BorderNode }): ReactNode => {
  const { renderTab } = useDashfooContext();
  const vertical = isVertical(node.edge);
  const selectedTab = node.children[node.selected];

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: vertical ? "row" : "column",
    height: vertical ? "100%" : undefined,
    width: vertical ? undefined : "100%",
  };

  const drawerStyle: CSSProperties = {
    minHeight: 0,
    minWidth: 0,
    overflow: "auto",
    ...(vertical ? { width: sizeToCss(node.size) } : { height: sizeToCss(node.size) }),
  };

  const strip = (
    <div data-dashfoo="border-strip" data-edge={node.edge} style={stripStyle(vertical)}>
      {node.children.map((tab, index) => (
        <BorderTab edge={node.edge} index={index} key={tab.id} selected={node.selected} tab={tab} />
      ))}
    </div>
  );

  const drawer = selectedTab ? (
    <section
      aria-label={selectedTab.name}
      data-dashfoo="border-drawer"
      data-edge={node.edge}
      style={drawerStyle}
    >
      {renderTab(selectedTab)}
    </section>
  ) : null;

  return (
    <div data-dashfoo="border" data-edge={node.edge} style={containerStyle}>
      {stripAtStart(node.edge) ? (
        <>
          {strip}
          {drawer}
        </>
      ) : (
        <>
          {drawer}
          {strip}
        </>
      )}
    </div>
  );
};

export { BorderView };

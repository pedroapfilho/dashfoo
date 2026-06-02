"use client";

import type { RowNode } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";

import { TabsetView } from "./tabset-view";

// Phase 4 renders rows as plain flex containers (weights become flex-grow). The
// rrp ResizeAdapter replaces this with draggable splitters in Phase 5; the
// component boundary stays the same.
const RowView = ({ node }: { node: RowNode }): ReactNode => {
  const style: CSSProperties = {
    display: "flex",
    flex: 1,
    flexDirection: node.orientation === "row" ? "row" : "column",
    minHeight: 0,
    minWidth: 0,
  };

  return (
    <div data-dashfoo="row" style={style}>
      {node.children.map((child) => {
        const childStyle: CSSProperties = {
          display: "flex",
          flexBasis: 0,
          flexGrow: child.weight ?? 1,
          minHeight: 0,
          minWidth: 0,
        };
        return (
          <div key={child.id} style={childStyle}>
            {child.type === "row" ? <RowView node={child} /> : <TabsetView node={child} />}
          </div>
        );
      })}
    </div>
  );
};

export { RowView };

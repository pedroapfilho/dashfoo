"use client";

import type { Dimension, RowNode } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import { Fragment, useRef } from "react";
import type { Layout, Orientation } from "react-resizable-panels";
import { Group, Panel, Separator } from "react-resizable-panels";

import { useDashfooContext } from "../hooks/context";

import { TabsetView } from "./tabset-view";

// This module is the resize adapter: the only place that imports
// react-resizable-panels. It maps the model's responsive weights to rrp's
// percentage layout and unit-typed min/max constraints to rrp sizes, and commits
// a drag (on release) back to the document as an adjustSplit action.

const dimensionToSize = (dimension: Dimension): string => `${dimension.value}${dimension.unit}`;

const groupStyle: CSSProperties = { display: "flex", flex: 1, minHeight: 0, minWidth: 0 };

const RowView = ({ node }: { node: RowNode }): ReactNode => {
  const { dispatch } = useDashfooContext();
  const orientation: Orientation = node.orientation === "row" ? "horizontal" : "vertical";
  const total = node.children.reduce((sum, child) => sum + (child.weight ?? 1), 0);

  // rrp fires onLayoutChanged once on mount with its measured layout. That is not
  // a user resize — committing it would rewrite the authored weights and push a
  // spurious undo entry — so the first call (per mount) is ignored.
  const measured = useRef(false);

  const handleLayoutChanged = (layout: Layout): void => {
    if (!measured.current) {
      measured.current = true;
      return;
    }
    const weights = node.children.map((child) => layout[child.id] ?? child.weight ?? 1);
    dispatch({ rowId: node.id, type: "adjustSplit", weights });
  };

  return (
    <Group
      data-dashfoo="row"
      key={node.children.map((child) => child.id).join("|")}
      onLayoutChanged={handleLayoutChanged}
      orientation={orientation}
      style={groupStyle}
    >
      {node.children.map((child, index) => {
        const percent = ((child.weight ?? 1) / total) * 100;
        const min = child.type === "tabset" && child.min ? dimensionToSize(child.min) : undefined;
        const max = child.type === "tabset" && child.max ? dimensionToSize(child.max) : undefined;

        return (
          <Fragment key={child.id}>
            {index > 0 ? <Separator data-dashfoo="splitter" /> : null}
            <Panel defaultSize={`${percent}%`} id={child.id} maxSize={max} minSize={min}>
              {child.type === "row" ? <RowView node={child} /> : <TabsetView node={child} />}
            </Panel>
          </Fragment>
        );
      })}
    </Group>
  );
};

export { RowView };

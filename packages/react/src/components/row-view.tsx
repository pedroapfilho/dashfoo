"use client";

import type { Dimension, RowNode, TabsetNode } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import { Fragment, useLayoutEffect, useMemo, useRef } from "react";
import type { GroupImperativeHandle, Layout, Orientation } from "react-resizable-panels";
import { Group, Panel, Separator } from "react-resizable-panels";

import { useLayout } from "../hooks/layout-store";

import { TabsetView } from "./tabset/tabset-view";

// This module is the resize adapter: the only place that imports
// react-resizable-panels. It maps the model's responsive weights to rrp's
// percentage layout and unit-typed min/max constraints to rrp sizes, and commits
// a drag (on release) back to the document as an adjustSplit action.

const dimensionToSize = (dimension: Dimension): string => `${dimension.value}${dimension.unit}`;
const dimensionToPixels = (dimension: Dimension | undefined): number | undefined =>
  dimension?.unit === "px" ? dimension.value : undefined;

const groupStyle: CSSProperties = { display: "flex", flex: 1, minHeight: 0, minWidth: 0 };
const WEIGHT_EPSILON = 0.01;

type LayoutChild = RowNode["children"][number];

const layoutFromWeights = (children: RowNode["children"], total: number): Layout =>
  children.reduce<Layout>((layout, child) => {
    layout[child.id] = ((child.weight ?? 1) / total) * 100;
    return layout;
  }, {});

const layoutsMatch = (current: Layout, expected: Layout): boolean => {
  const currentIds = Object.keys(current);
  const expectedIds = Object.keys(expected);
  if (currentIds.length !== expectedIds.length) {
    return false;
  }
  return expectedIds.every(
    (id) => Math.abs((current[id] ?? Number.NaN) - expected[id]) <= WEIGHT_EPSILON,
  );
};

const descendantMinSize = (
  child: LayoutChild,
  axis: RowNode["orientation"],
  tabsetMinSize: number,
): number | undefined => {
  const explicit = dimensionToPixels(child.min);
  if (explicit !== undefined) {
    return explicit;
  }
  if (child.min !== undefined) {
    return undefined;
  }
  if (child.type === "tabset") {
    return tabsetMinSize;
  }

  const childMinimums: Array<number> = [];
  for (const grandchild of child.children) {
    const minimum = descendantMinSize(grandchild, axis, tabsetMinSize);
    if (minimum === undefined) {
      return undefined;
    }
    childMinimums.push(minimum);
  }
  if (childMinimums.length === 0) {
    return undefined;
  }

  return child.orientation === axis
    ? childMinimums.reduce((sum, value) => sum + value, 0)
    : Math.max(...childMinimums);
};

type RowViewProps = {
  node: RowNode;
  // Substitutes a custom tabset composition at every leaf of the split tree;
  // defaults to the stock TabsetView.
  renderTabset?: (node: TabsetNode) => ReactNode;
};

const RowView = ({ node, renderTabset }: RowViewProps): ReactNode => {
  const dispatch = useLayout((state) => state.dispatch);
  const resizableSplits = useLayout((state) => state.resizableSplits);
  const tabsetMinSize = useLayout((state) => state.tabsetMinSize);
  const orientation: Orientation = node.orientation === "row" ? "horizontal" : "vertical";
  const total = node.children.reduce((sum, child) => sum + (child.weight ?? 1), 0);
  const desiredLayout = useMemo(
    () => layoutFromWeights(node.children, total),
    [node.children, total],
  );

  // rrp fires onLayoutChanged once on mount with its measured layout. That is not
  // a user resize — committing it would rewrite the authored weights and push a
  // spurious undo entry — so the first call (per mount) is ignored.
  const measured = useRef(false);
  const groupRef = useRef<GroupImperativeHandle | null>(null);
  const syncing = useRef(false);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }
    if (layoutsMatch(group.getLayout(), desiredLayout)) {
      return;
    }

    syncing.current = true;
    group.setLayout(desiredLayout);
    const frame = requestAnimationFrame(() => {
      syncing.current = false;
    });
    return () => {
      cancelAnimationFrame(frame);
      syncing.current = false;
    };
  }, [desiredLayout]);

  const handleLayoutChanged = (layout: Layout): void => {
    if (!measured.current) {
      measured.current = true;
      return;
    }
    if (syncing.current) {
      return;
    }
    // Belt over the disabled Group/Separator: a non-resizable row never commits
    // an adjustSplit, even if rrp reports a layout change for another reason.
    if (!resizableSplits) {
      return;
    }
    const weights = node.children.map((child) => layout[child.id] ?? child.weight ?? 1);
    const weightsChanged = weights.some(
      (weight, index) => Math.abs(weight - (node.children[index]?.weight ?? 1)) > WEIGHT_EPSILON,
    );

    if (!weightsChanged) {
      return;
    }

    dispatch({
      rowId: node.id,
      type: "adjustSplit",
      weights,
    });
  };

  return (
    <Group
      data-dashfoo="row"
      disabled={!resizableSplits}
      groupRef={groupRef}
      key={node.children.map((child) => child.id).join("|")}
      onLayoutChanged={handleLayoutChanged}
      orientation={orientation}
      style={groupStyle}
    >
      {node.children.map((child, index) => {
        const percent = ((child.weight ?? 1) / total) * 100;
        let min = child.min ? dimensionToSize(child.min) : undefined;
        if (min === undefined) {
          const minimum = descendantMinSize(child, node.orientation, tabsetMinSize);
          min = minimum === undefined ? undefined : `${minimum}px`;
        }
        const max = child.max ? dimensionToSize(child.max) : undefined;

        return (
          <Fragment key={child.id}>
            {/* The separator stays mounted when resizing is off — removing it
                would collapse the theme-sized gutter and reflow every panel. */}
            {index > 0 ? <Separator data-dashfoo="splitter" disabled={!resizableSplits} /> : null}
            <Panel defaultSize={`${percent}%`} id={child.id} maxSize={max} minSize={min}>
              {child.type === "row" ? (
                <RowView node={child} renderTabset={renderTabset} />
              ) : (
                (renderTabset?.(child) ?? <TabsetView node={child} />)
              )}
            </Panel>
          </Fragment>
        );
      })}
    </Group>
  );
};

export { RowView };
export type { RowViewProps };

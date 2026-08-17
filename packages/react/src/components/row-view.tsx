"use client";

import type { Dimension, RowNode, SnapConfig, TabsetNode } from "@dashfoo/core";
import { resolveSnapGrid, snapEnabled } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import { Fragment, useMemo } from "react";
import type { Orientation } from "react-resizable-panels";
import { Group, Panel, Separator } from "react-resizable-panels";

import { useLayout } from "../hooks/layout-store";
import { useSnapResize } from "../hooks/use-snap-resize";

import { TabsetView } from "./tabset/tabset-view";

const dimensionToSize = (dimension: Dimension): string => `${dimension.value}${dimension.unit}`;
const dimensionToPixels = (dimension: Dimension | undefined): number | undefined =>
  dimension?.unit === "px" ? dimension.value : undefined;

const groupStyle: CSSProperties = { display: "flex", flex: 1, minHeight: 0, minWidth: 0 };

type LayoutChild = RowNode["children"][number];

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

  renderTabset?: (node: TabsetNode) => ReactNode;
};

const RowView = ({ node, renderTabset }: RowViewProps): ReactNode => {
  const dispatch = useLayout((state) => state.dispatch);
  const resizableSplits = useLayout((state) => state.resizableSplits);
  const tabsetMinSize = useLayout((state) => state.tabsetMinSize);
  const globalSnap = useLayout((state) => state.snap);

  const effectiveSnap: SnapConfig | null = node.snap ?? globalSnap;
  /**
   * Resolved once per row rather than rebuilt inside every pointer-move
   * decision, and it is the same value that decides whether the per-move
   * listener is attached at all.
   */
  const snapGrid = useMemo(
    () => resolveSnapGrid(effectiveSnap, node.children.length),
    [effectiveSnap, node.children.length],
  );
  const snapActive = snapEnabled(snapGrid);
  const orientation: Orientation = node.orientation === "row" ? "horizontal" : "vertical";
  const total = node.children.reduce((sum, child) => sum + child.weight, 0);

  const { beginBoundaryDrag, groupRef, onLayoutChange, onLayoutChanged, snappedBoundary } =
    useSnapResize({
      children: node.children,
      onWeightsSettled: (weights) => {
        dispatch({ rowId: node.id, type: "adjustSplit", weights });
      },
      resizableSplits,
      snap: snapGrid,
    });

  return (
    <Group
      data-dashfoo="row"
      data-dashfoo-snapping={snappedBoundary === null ? undefined : "true"}
      disabled={!resizableSplits}
      groupRef={groupRef}
      key={node.id}
      onLayoutChange={snapActive ? onLayoutChange : undefined}
      onLayoutChanged={onLayoutChanged}
      orientation={orientation}
      style={groupStyle}
    >
      {node.children.map((child, index) => {
        const percent = (child.weight / total) * 100;
        let min = child.min ? dimensionToSize(child.min) : undefined;
        if (min === undefined) {
          const minimum = descendantMinSize(child, node.orientation, tabsetMinSize);
          min = minimum === undefined ? undefined : `${minimum}px`;
        }
        const max = child.max ? dimensionToSize(child.max) : undefined;

        return (
          <Fragment key={child.id}>
            {index > 0 ? (
              <Separator
                data-dashfoo="splitter"
                data-dashfoo-snapped={snappedBoundary === index - 1 ? "true" : undefined}
                disabled={!resizableSplits}
                onPointerDown={
                  snapActive && resizableSplits
                    ? () => {
                        beginBoundaryDrag(index - 1);
                      }
                    : undefined
                }
              />
            ) : null}
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

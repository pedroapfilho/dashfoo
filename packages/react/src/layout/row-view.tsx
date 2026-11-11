"use client";

import type { Dimension, RowNode, SnapConfig, TabsetNode } from "@dashfoo/core";
import { collectTabsetsInRow, resolveSnapGrid, snapEnabled } from "@dashfoo/core";
import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";
import type { Orientation } from "react-resizable-panels";
import { Group, Panel, Separator } from "react-resizable-panels";

import { resizePanelId } from "../lib/dom-ids";
import { TabsetView } from "../tabset/tabset-view";

import { useLayout } from "./layout-store";
import { percentagesOf, useSnapResize } from "./use-snap-resize";

const dimensionToSize = (dimension: Dimension): string => `${dimension.value}${dimension.unit}`;

const dimensionToPixels = (dimension: Dimension | undefined): number | undefined =>
  dimension?.unit === "px" ? dimension.value : undefined;

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

const RowGroup = ({ node, renderTabset }: RowViewProps): ReactNode => {
  const dispatch = useLayout((state) => state.dispatch);
  const documentId = useLayout((state) => state.documentId);
  const resizableSplits = useLayout((state) => state.resizableSplits);
  const tabsetMinSize = useLayout((state) => state.tabsetMinSize);
  const globalSnap = useLayout((state) => state.snap);

  const effectiveSnap: SnapConfig | null = node.snap ?? globalSnap;

  // Resolved once per row, and the same value decides whether the per-move
  // listener is attached at all.
  const snapGrid = useMemo(
    () => resolveSnapGrid(effectiveSnap, node.children.length),
    [effectiveSnap, node.children.length],
  );

  const snapActive = snapEnabled(snapGrid);
  const orientation: Orientation = node.orientation === "row" ? "horizontal" : "vertical";

  const panels = useMemo(
    () =>
      node.children.map((child) => ({
        child,
        id: resizePanelId(documentId, child.id),
        weight: child.weight,
      })),
    [documentId, node.children],
  );

  const percentages = percentagesOf(panels);

  const { beginBoundaryDrag, groupRef, onLayoutChange, onLayoutChanged, snappedBoundary } =
    useSnapResize({
      onWeightsSettled: (weights) => {
        dispatch({ rowId: node.id, type: "adjustSplit", weights });
      },
      panels,
      resizableSplits,
      snap: snapGrid,
    });

  return (
    <Group
      data-dashfoo="row"
      data-dashfoo-snapping={snappedBoundary === null ? undefined : "true"}
      data-row-id={node.id}
      disabled={!resizableSplits}
      groupRef={groupRef}
      key={node.id}
      onLayoutChange={snapActive ? onLayoutChange : undefined}
      onLayoutChanged={onLayoutChanged}
      orientation={orientation}
    >
      {panels.map(({ child, id }, index) => {
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
            <Panel defaultSize={`${percentages[index] ?? 0}%`} id={id} maxSize={max} minSize={min}>
              {child.type === "row" ? (
                <RowGroup node={child} renderTabset={renderTabset} />
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

/**
 * The rows of a layout, or only its maximized tabset while one is maximized, so
 * every layout honors maximize without branching on it.
 */
const RowView = ({ node, renderTabset }: RowViewProps): ReactNode => {
  const maximizedTabsetId = useLayout((state) => state.maximizedTabsetId);

  const maximized =
    maximizedTabsetId === undefined
      ? undefined
      : collectTabsetsInRow(node).find((tabset) => tabset.id === maximizedTabsetId);

  if (maximized) {
    return renderTabset?.(maximized) ?? <TabsetView node={maximized} />;
  }

  return <RowGroup node={node} renderTabset={renderTabset} />;
};

export { RowView };

export type { RowViewProps };

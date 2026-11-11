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
import { GutterContext, useGutter, useGutterRoot } from "./use-gutter";
import { percentagesOf, useSnapResize } from "./use-snap-resize";

const dimensionToSize = (dimension: Dimension): string => `${dimension.value}${dimension.unit}`;

const dimensionToPixels = (dimension: Dimension | undefined): number | undefined =>
  dimension?.unit === "px" ? dimension.value : undefined;

type LayoutChild = RowNode["children"][number];

/** `gutter` is what each boundary inside a nested row adds along that row's axis. */
const descendantMinSize = (
  child: LayoutChild,
  axis: RowNode["orientation"],
  tabsetMinSize: number,
  gutter: number,
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
    const minimum = descendantMinSize(grandchild, axis, tabsetMinSize, gutter);

    if (minimum === undefined) {
      return undefined;
    }

    childMinimums.push(minimum);
  }

  if (childMinimums.length === 0) {
    return undefined;
  }

  return child.orientation === axis
    ? childMinimums.reduce((sum, value) => sum + value, 0) + gutter * (childMinimums.length - 1)
    : Math.max(...childMinimums);
};

/** A child's own `min`, else the minimum its tabsets add up to. */
const panelMinSize = (
  child: LayoutChild,
  axis: RowNode["orientation"],
  tabsetMinSize: number,
  gutter: number,
): string | undefined => {
  if (child.min) {
    return dimensionToSize(child.min);
  }

  const minimum = descendantMinSize(child, axis, tabsetMinSize, gutter);

  return minimum === undefined ? undefined : `${minimum}px`;
};

type RowViewProps = {
  node: RowNode;

  renderTabset?: (node: TabsetNode) => ReactNode;
};

/** `boundary` is the index of the boundary before this panel; the first panel has none. */
type RowSplitterProps = {
  boundary: number;
  disabled: boolean;
  onBoundaryDrag: ((boundary: number) => void) | undefined;
  snappedBoundary: number | null;
};

const RowSplitter = ({
  boundary,
  disabled,
  onBoundaryDrag,
  snappedBoundary,
}: RowSplitterProps): ReactNode =>
  boundary < 0 ? null : (
    <Separator
      data-dashfoo="splitter"
      data-dashfoo-snapped={snappedBoundary === boundary ? "true" : undefined}
      disabled={disabled}
      onPointerDown={
        onBoundaryDrag && !disabled
          ? () => {
              onBoundaryDrag(boundary);
            }
          : undefined
      }
    />
  );

type RowPanelProps = {
  axis: RowNode["orientation"];
  child: LayoutChild;
  children: ReactNode;
  gutter: number;
  id: string;
  percentage: number | undefined;
  tabsetMinSize: number;
};

const RowPanel = ({
  axis,
  child,
  children,
  gutter,
  id,
  percentage,
  tabsetMinSize,
}: RowPanelProps): ReactNode => (
  <Panel
    defaultSize={`${percentage ?? 0}%`}
    id={id}
    maxSize={child.max ? dimensionToSize(child.max) : undefined}
    minSize={panelMinSize(child, axis, tabsetMinSize, gutter)}
  >
    {children}
  </Panel>
);

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

  const { groupRef: gutterRef, gutter } = useGutter(
    orientation === "horizontal",
    node.children.length,
  );

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
      disabled={!resizableSplits}
      elementRef={gutterRef}
      groupRef={groupRef}
      key={node.id}
      onLayoutChange={snapActive ? onLayoutChange : undefined}
      onLayoutChanged={onLayoutChanged}
      orientation={orientation}
    >
      {panels.map(({ child, id }, index) => (
        <Fragment key={child.id}>
          <RowSplitter
            boundary={index - 1}
            disabled={!resizableSplits}
            onBoundaryDrag={snapActive ? beginBoundaryDrag : undefined}
            snappedBoundary={snappedBoundary}
          />
          <RowPanel
            axis={node.orientation}
            child={child}
            gutter={gutter}
            id={id}
            percentage={percentages[index]}
            tabsetMinSize={tabsetMinSize}
          >
            {child.type === "row" ? (
              <RowGroup node={child} renderTabset={renderTabset} />
            ) : (
              (renderTabset?.(child) ?? <TabsetView node={child} />)
            )}
          </RowPanel>
        </Fragment>
      ))}
    </Group>
  );
};

const RowRoot = ({ node, renderTabset }: RowViewProps): ReactNode => {
  const gutter = useGutterRoot();

  return (
    <GutterContext.Provider value={gutter}>
      <RowGroup node={node} renderTabset={renderTabset} />
    </GutterContext.Provider>
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

  return <RowRoot node={node} renderTabset={renderTabset} />;
};

export { descendantMinSize, RowView };

export type { RowViewProps };

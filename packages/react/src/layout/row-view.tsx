"use client";

import type { Dimension, RowNode, SnapConfig, TabsetNode } from "@dashfoo/core";
import { collectTabsetsInRow } from "@dashfoo/core";
import { resolveSnapGrid, snapEnabled } from "@dashfoo/core/internal";
import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";
import type { Orientation, PanelProps } from "react-resizable-panels";
import { Group, Panel, Separator } from "react-resizable-panels";

import { useTabsetDroppable } from "../drag/drag-hooks";
import { resizePanelId } from "../lib/dom-ids";
import { mergeRefs } from "../lib/merge-refs";
import { PART } from "../lib/parts";
import { TabsetView } from "../tabset/tabset-view";

import { useLayout } from "./layout-store";
import { TabsetSlotContext } from "./tabset-slot";
import type { CollapsiblePanels } from "./use-collapsible-panels";
import { useCollapsiblePanels } from "./use-collapsible-panels";
import { GutterContext, useGutter, useGutterRoot } from "./use-gutter";
import { percentagesOf, useSnapResize } from "./use-snap-resize";

const dimensionToSize = (dimension: Dimension): string => `${dimension.value}${dimension.unit}`;

const dimensionToPixels = (dimension: Dimension | undefined): number | undefined =>
  dimension?.unit === "px" ? dimension.value : undefined;

type LayoutChild = RowNode["children"][number];

/** In pixels, or `undefined` when a minimum is set in a relative unit. `gutter` is what each boundary inside a nested row adds along that row's axis. */
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

const sizeConstraints = (
  child: LayoutChild,
  axis: RowNode["orientation"],
  tabsetMinSize: number,
  gutter: number,
): Pick<PanelProps, "maxSize" | "minSize"> => {
  const derived = child.min ? undefined : descendantMinSize(child, axis, tabsetMinSize, gutter);
  const fallback = derived === undefined ? undefined : `${derived}px`;

  return {
    maxSize: child.max ? dimensionToSize(child.max) : undefined,
    minSize: child.min ? dimensionToSize(child.min) : fallback,
  };
};

type RowViewProps = {
  node: RowNode;

  renderTabset?: (node: TabsetNode) => ReactNode;
};

type RowGroupProps = RowViewProps & { isRoot?: boolean };

type RowSeparatorProps = {
  boundary: number;
  disabled: boolean;
  /** Set only while snapping is active, so the press listener exists only then. */
  onBoundaryDown: ((boundary: number) => void) | undefined;
  snapped: boolean;
};

const RowSeparator = ({
  boundary,
  disabled,
  onBoundaryDown,
  snapped,
}: RowSeparatorProps): ReactNode => (
  <Separator
    data-dashfoo={PART.splitter}
    data-dashfoo-snapped={snapped ? "true" : undefined}
    disabled={disabled}
    onPointerDown={
      onBoundaryDown
        ? () => {
            onBoundaryDown(boundary);
          }
        : undefined
    }
  />
);

const tabsetView = (node: TabsetNode, renderTabset: RowViewProps["renderTabset"]): ReactNode =>
  renderTabset?.(node) ?? <TabsetView node={node} />;

type RowPanelContentProps = Pick<RowViewProps, "renderTabset"> & {
  alone: boolean;
  child: LayoutChild;
  collapse: CollapsiblePanels;
};

/** A nested row, or a tabset told what its split allows it. */
const RowPanelContent = ({
  alone,
  child,
  collapse,
  renderTabset,
}: RowPanelContentProps): ReactNode =>
  child.type === "row" ? (
    // oxlint-disable-next-line no-use-before-define -- RowGroup and its panels recurse into each other
    <RowGroup node={child} renderTabset={renderTabset} />
  ) : (
    <TabsetSlotContext.Provider value={collapse.slotFor(child, alone)}>
      {tabsetView(child, renderTabset)}
    </TabsetSlotContext.Provider>
  );

type RowSizingOptions = {
  horizontal: boolean;
  node: RowNode;
  panelIdOf: (childId: string) => string;
  tabsetMinSize: number;
};

type RowSizing = {
  collapse: CollapsiblePanels;
  elementRef: (element: HTMLDivElement | null) => void;
  gutter: number;
};

/** The row element feeds both the gutter measure and the collapse handles. */
const useRowSizing = ({
  horizontal,
  node,
  panelIdOf,
  tabsetMinSize,
}: RowSizingOptions): RowSizing => {
  const { groupRef: gutterRef, gutter } = useGutter(horizontal, node.children.length);

  const collapse = useCollapsiblePanels({
    minPixels: (child) => descendantMinSize(child, node.orientation, tabsetMinSize, gutter),
    node,
    panelIdOf,
  });

  const { setGroupElement } = collapse;

  const elementRef = useMemo(
    () => mergeRefs<HTMLDivElement>(gutterRef, setGroupElement),
    [gutterRef, setGroupElement],
  );

  return { collapse, elementRef, gutter };
};

const RowGroup = ({ isRoot = false, node, renderTabset }: RowGroupProps): ReactNode => {
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

  const { collapse, elementRef, gutter } = useRowSizing({
    horizontal: orientation === "horizontal",
    node,
    panelIdOf: (childId) => resizePanelId(documentId, childId),
    tabsetMinSize,
  });

  const { collapsedIds, groupRef } = collapse;

  const panels = useMemo(
    () =>
      node.children.map((child) => ({
        child,
        collapsed: collapsedIds.has(child.id),
        id: resizePanelId(documentId, child.id),
        weight: child.weight,
      })),
    [collapsedIds, documentId, node.children],
  );

  const percentages = percentagesOf(panels);

  const { beginBoundaryDrag, onLayoutChange, onLayoutChanged, snappedBoundary } = useSnapResize({
    groupRef,
    onWeightsSettled: collapse.settle,
    panels,
    resizableSplits,
    snap: snapGrid,
  });

  const alone = isRoot && node.children.length === 1;
  const handleBoundaryDown = snapActive && resizableSplits ? beginBoundaryDrag : undefined;

  return (
    <Group
      data-dashfoo={PART.row}
      data-dashfoo-snapping={snappedBoundary === null ? undefined : "true"}
      data-row-id={node.id}
      disabled={!resizableSplits}
      elementRef={elementRef}
      groupRef={groupRef}
      key={node.id}
      onLayoutChange={snapActive ? onLayoutChange : undefined}
      onLayoutChanged={onLayoutChanged}
      orientation={orientation}
    >
      {panels.map(({ child, id }, index) => (
        <Fragment key={child.id}>
          {index > 0 ? (
            <RowSeparator
              boundary={index - 1}
              disabled={!resizableSplits}
              onBoundaryDown={handleBoundaryDown}
              snapped={snappedBoundary === index - 1}
            />
          ) : null}
          <Panel
            {...collapse.panelProps(child)}
            {...sizeConstraints(child, node.orientation, tabsetMinSize, gutter)}
            defaultSize={`${percentages[index] ?? 0}%`}
            id={id}
          >
            <RowPanelContent
              alone={alone}
              child={child}
              collapse={collapse}
              renderTabset={renderTabset}
            />
          </Panel>
        </Fragment>
      ))}
    </Group>
  );
};

const RowRoot = ({ node, renderTabset }: RowViewProps): ReactNode => {
  const gutter = useGutterRoot();

  return (
    <GutterContext.Provider value={gutter}>
      <RowGroup isRoot node={node} renderTabset={renderTabset} />
    </GutterContext.Provider>
  );
};

/** A layout whose last tabset left still takes drops: its row id seeds the next tabset. */
const EmptyLayout = ({ rowId }: { rowId: string }): ReactNode => {
  const { ref } = useTabsetDroppable(rowId);

  return <div data-dashfoo="layout-empty" ref={ref} />;
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
    return tabsetView(maximized, renderTabset);
  }

  if (node.children.length === 0) {
    return <EmptyLayout rowId={node.id} />;
  }

  return <RowRoot node={node} renderTabset={renderTabset} />;
};

export { descendantMinSize, RowView };

export type { RowViewProps };

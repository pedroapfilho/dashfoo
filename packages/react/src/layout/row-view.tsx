"use client";

import type { Dimension, RowNode, SnapConfig, TabsetNode } from "@dashfoo/core";
import { collectTabsetsInRow, resolveSnapGrid, snapEnabled } from "@dashfoo/core";
import type { ReactNode } from "react";
import { Fragment, useMemo, useRef, useState } from "react";
import type { GroupImperativeHandle, Orientation } from "react-resizable-panels";
import { Group, Panel, Separator } from "react-resizable-panels";

import { resizePanelId } from "../lib/dom-ids";
import { TabsetView } from "../tabset/tabset-view";

import { useLayout } from "./layout-store";
import { TabsetSlotContext } from "./tabset-slot";
import { useCollapsiblePanels } from "./use-collapsible-panels";
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

type RowGroupProps = RowViewProps & { isRoot?: boolean };

const RowGroup = ({ isRoot = false, node, renderTabset }: RowGroupProps): ReactNode => {
  const dispatch = useLayout((state) => state.dispatch);
  const documentId = useLayout((state) => state.documentId);
  const resizableSplits = useLayout((state) => state.resizableSplits);
  const tabsetMinSize = useLayout((state) => state.tabsetMinSize);
  const globalSnap = useLayout((state) => state.snap);
  const [groupElement, setGroupElement] = useState<HTMLDivElement | null>(null);
  const groupRef = useRef<GroupImperativeHandle | null>(null);

  const effectiveSnap: SnapConfig | null = node.snap ?? globalSnap;

  // Resolved once per row, and the same value decides whether the per-move
  // listener is attached at all.
  const snapGrid = useMemo(
    () => resolveSnapGrid(effectiveSnap, node.children.length),
    [effectiveSnap, node.children.length],
  );

  const snapActive = snapEnabled(snapGrid);
  const orientation: Orientation = node.orientation === "row" ? "horizontal" : "vertical";

  const minPixels = (child: LayoutChild): number | undefined =>
    dimensionToPixels(child.min) ??
    (child.min === undefined
      ? descendantMinSize(child, node.orientation, tabsetMinSize)
      : undefined);

  const collapse = useCollapsiblePanels({
    dispatch,
    groupElement,
    groupRef,
    minPixels,
    node,
    panelIdOf: (childId) => resizePanelId(documentId, childId),
  });

  const { collapsedIds } = collapse;

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

  return (
    <Group
      data-dashfoo="row"
      data-dashfoo-snapping={snappedBoundary === null ? undefined : "true"}
      disabled={!resizableSplits}
      elementRef={setGroupElement}
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
        const collapsible = collapse.isCollapsible(child);
        const headerSize = collapse.headerSizes.get(child.id);

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
            <Panel
              collapsedSize={
                collapsible && headerSize !== undefined ? `${headerSize}px` : undefined
              }
              collapsible={collapsible}
              defaultSize={`${percentages[index] ?? 0}%`}
              elementRef={(element) => {
                collapse.registerElement(child.id, element);
              }}
              id={id}
              maxSize={max}
              minSize={min}
              panelRef={(handle) => {
                collapse.registerHandle(child.id, handle);
              }}
            >
              {child.type === "row" ? (
                <RowGroup node={child} renderTabset={renderTabset} />
              ) : (
                <TabsetSlotContext.Provider
                  value={{
                    alone: isRoot && node.children.length === 1,
                    canCollapse: collapsible && !collapsedIds.has(child.id),
                    collapsed: collapsedIds.has(child.id),
                    collapsedToFit: collapse.fitIds.has(child.id),
                    orientation: node.orientation,
                  }}
                >
                  {renderTabset?.(child) ?? <TabsetView node={child} />}
                </TabsetSlotContext.Provider>
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

  return <RowGroup isRoot node={node} renderTabset={renderTabset} />;
};

export { RowView };

export type { RowViewProps };

"use client";

import type { Dimension, RowNode, SnapConfig, TabsetNode } from "@dashfoo/core";
import { snapEnabled, snapSizes } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  GroupImperativeHandle,
  Layout,
  LayoutChangedMeta,
  Orientation,
} from "react-resizable-panels";
import { Group, Panel, Separator } from "react-resizable-panels";

import { useLayout } from "../hooks/layout-store";

import { TabsetView } from "./tabset/tabset-view";

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

const orderedFromLayout = (layout: Layout, children: RowNode["children"]): Array<number> =>
  children.map((child) => layout[child.id] ?? 0);

const layoutFromOrdered = (sizes: Array<number>, children: RowNode["children"]): Layout =>
  children.reduce<Layout>((layout, child, index) => {
    layout[child.id] = sizes[index] ?? 0;
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

  renderTabset?: (node: TabsetNode) => ReactNode;
};

const RowView = ({ node, renderTabset }: RowViewProps): ReactNode => {
  const dispatch = useLayout((state) => state.dispatch);
  const resizableSplits = useLayout((state) => state.resizableSplits);
  const tabsetMinSize = useLayout((state) => state.tabsetMinSize);
  const globalSnap = useLayout((state) => state.snap);

  const effectiveSnap: SnapConfig | null = node.snap ?? globalSnap;
  const snapActive = snapEnabled(effectiveSnap);
  const orientation: Orientation = node.orientation === "row" ? "horizontal" : "vertical";
  const total = node.children.reduce((sum, child) => sum + (child.weight ?? 1), 0);
  const desiredLayout = useMemo(
    () => layoutFromWeights(node.children, total),
    [node.children, total],
  );

  const groupRef = useRef<GroupImperativeHandle | null>(null);
  const groupElement = useRef<HTMLDivElement | null>(null);
  const syncing = useRef(false);

  const activeBoundary = useRef<number | null>(null);
  const snapping = useRef(false);
  const snappedBoundaryRef = useRef<number | null>(null);
  const [snappedBoundary, setSnappedBoundary] = useState<number | null>(null);

  const setHighlight = (boundary: number | null): void => {
    if (boundary !== snappedBoundaryRef.current) {
      snappedBoundaryRef.current = boundary;
      setSnappedBoundary(boundary);
    }
  };

  const setSnapTransition = (active: boolean): void => {
    const element = groupElement.current;
    if (!element) {
      return;
    }
    if (active) {
      element.dataset.dashfooSnapping = "true";
    } else {
      delete element.dataset.dashfooSnapping;
    }
  };

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }
    const current = group.getLayout();
    const samePanelSet =
      Object.keys(current).length === Object.keys(desiredLayout).length &&
      Object.keys(desiredLayout).every((id) => id in current);
    if (!samePanelSet || layoutsMatch(current, desiredLayout)) {
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

  const handleLayoutChange = (layout: Layout): void => {
    if (snapping.current || syncing.current || !resizableSplits) {
      return;
    }
    if (effectiveSnap === null || !snapActive) {
      return;
    }
    const boundary = activeBoundary.current;
    if (boundary === null) {
      return;
    }

    const { sizes, snapped } = snapSizes(
      orderedFromLayout(layout, node.children),
      boundary,
      effectiveSnap,
    );
    setHighlight(snapped ? boundary : null);
    if (!snapped) {
      setSnapTransition(false);
      return;
    }

    setSnapTransition(true);
    const group = groupRef.current;
    const target = layoutFromOrdered(sizes, node.children);
    if (!group || layoutsMatch(layout, target)) {
      return;
    }
    snapping.current = true;
    group.setLayout(target);
    snapping.current = false;
  };

  const handleLayoutChanged = (layout: Layout, meta: LayoutChangedMeta): void => {
    if (!meta.isUserInteraction) {
      return;
    }
    if (syncing.current) {
      return;
    }
    const boundary = activeBoundary.current;
    activeBoundary.current = null;
    setHighlight(null);
    setSnapTransition(false);

    if (!resizableSplits) {
      return;
    }
    let weights = node.children.map((child) => layout[child.id] ?? child.weight ?? 1);

    if (boundary !== null && effectiveSnap !== null && snapActive) {
      weights = snapSizes(weights, boundary, effectiveSnap).sizes;
    }
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
      elementRef={groupElement}
      groupRef={groupRef}
      key={node.id}
      onLayoutChange={snapActive ? handleLayoutChange : undefined}
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
            {}
            {index > 0 ? (
              <Separator
                data-dashfoo="splitter"
                data-dashfoo-snapped={snappedBoundary === index - 1 ? "true" : undefined}
                disabled={!resizableSplits}
                onPointerDown={
                  snapActive && resizableSplits
                    ? () => {
                        activeBoundary.current = index - 1;
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

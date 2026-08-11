"use client";

import type { RowNode, SnapConfig } from "@dashfoo/core";
import { decideSnap, settleSnap } from "@dashfoo/core";
import type { RefObject } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { GroupImperativeHandle, Layout, LayoutChangedMeta } from "react-resizable-panels";

const WEIGHT_EPSILON = 0.01;

type RowChildren = RowNode["children"];

/**
 * A resize gesture is in exactly one of these states. `syncing` covers every write this hook makes
 * to the group itself: the group echoes an imperative `setLayout` back through `onLayoutChange`
 * synchronously, and that echo must not be mistaken for user input.
 */
type ResizeState =
  | { kind: "idle" }
  | { kind: "syncing" }
  | { boundary: number; kind: "dragging" }
  | { boundary: number; kind: "snapped" };

const IDLE: ResizeState = { kind: "idle" };

const boundaryOf = (state: ResizeState): number | null =>
  state.kind === "dragging" || state.kind === "snapped" ? state.boundary : null;

const snappedBoundaryOf = (state: ResizeState): number | null =>
  state.kind === "snapped" ? state.boundary : null;

const layoutFromWeights = (children: RowChildren): Layout => {
  const total = children.reduce((sum, child) => sum + child.weight, 0);
  return children.reduce<Layout>((layout, child) => {
    layout[child.id] = (child.weight / total) * 100;
    return layout;
  }, {});
};

const orderedFromLayout = (layout: Layout, children: RowChildren): Array<number> =>
  children.map((child) => layout[child.id] ?? 0);

const layoutFromOrdered = (sizes: Array<number>, children: RowChildren): Layout =>
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

type SnapResizeOptions = {
  children: RowChildren;
  onWeightsSettled: (weights: Array<number>) => void;
  resizableSplits: boolean;
  snap: SnapConfig | null;
};

type SnapResize = {
  beginBoundaryDrag: (boundary: number) => void;
  groupRef: RefObject<GroupImperativeHandle | null>;
  onLayoutChange: (layout: Layout) => void;
  onLayoutChanged: (layout: Layout, meta: LayoutChangedMeta) => void;
  snappedBoundary: number | null;
};

const useSnapResize = ({
  children,
  onWeightsSettled,
  resizableSplits,
  snap,
}: SnapResizeOptions): SnapResize => {
  const groupRef = useRef<GroupImperativeHandle | null>(null);
  const state = useRef<ResizeState>(IDLE);
  const [snappedBoundary, setSnappedBoundary] = useState<number | null>(null);

  const transition = useCallback((next: ResizeState): void => {
    state.current = next;
    setSnappedBoundary(snappedBoundaryOf(next));
  }, []);

  const desiredLayout = useMemo(() => layoutFromWeights(children), [children]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return undefined;
    }
    const current = group.getLayout();
    const samePanelSet =
      Object.keys(current).length === Object.keys(desiredLayout).length &&
      Object.keys(desiredLayout).every((id) => id in current);
    if (!samePanelSet || layoutsMatch(current, desiredLayout)) {
      return undefined;
    }

    transition({ kind: "syncing" });
    group.setLayout(desiredLayout);
    const frame = requestAnimationFrame(() => {
      transition(IDLE);
    });
    return () => {
      cancelAnimationFrame(frame);
      transition(IDLE);
    };
  }, [desiredLayout, transition]);

  const onLayoutChange = (layout: Layout): void => {
    if (state.current.kind === "syncing" || !resizableSplits) {
      return;
    }
    const boundary = boundaryOf(state.current);
    if (boundary === null) {
      return;
    }

    const decision = decideSnap(orderedFromLayout(layout, children), boundary, snap);
    if (decision.kind === "inactive") {
      return;
    }
    if (decision.kind === "clear") {
      transition({ boundary, kind: "dragging" });
      return;
    }

    transition({ boundary, kind: "snapped" });
    const group = groupRef.current;
    const target = layoutFromOrdered(decision.sizes, children);
    if (!group || layoutsMatch(layout, target)) {
      return;
    }
    transition({ kind: "syncing" });
    group.setLayout(target);
    transition({ boundary, kind: "snapped" });
  };

  const onLayoutChanged = (layout: Layout, meta: LayoutChangedMeta): void => {
    if (!meta.isUserInteraction) {
      return;
    }
    if (state.current.kind === "syncing") {
      return;
    }
    const boundary = boundaryOf(state.current);
    transition(IDLE);

    if (!resizableSplits) {
      return;
    }
    const weights = settleSnap(
      children.map((child) => layout[child.id] ?? child.weight),
      boundary,
      snap,
    );
    const weightsChanged = weights.some((weight, index) => {
      const child = children[index];
      return child !== undefined && Math.abs(weight - child.weight) > WEIGHT_EPSILON;
    });
    if (!weightsChanged) {
      return;
    }

    onWeightsSettled(weights);
  };

  const beginBoundaryDrag = (boundary: number): void => {
    transition({ boundary, kind: "dragging" });
  };

  return { beginBoundaryDrag, groupRef, onLayoutChange, onLayoutChanged, snappedBoundary };
};

export { useSnapResize };
export type { SnapResize, SnapResizeOptions };

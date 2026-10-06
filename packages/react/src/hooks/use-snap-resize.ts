"use client";

import type { RowNode, SnapGrid } from "@dashfoo/core";
import { decideSnap, settleSnap } from "@dashfoo/core";
import type { RefObject } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { GroupImperativeHandle, Layout, LayoutChangedMeta } from "react-resizable-panels";

const WEIGHT_EPSILON = 0.01;

type RowChildren = RowNode["children"];

/** `syncing` covers this hook's own writes: the group echoes an imperative
 * `setLayout` back synchronously, and that echo is not user input. */
type ResizeState =
  | { kind: "idle" }
  | { kind: "syncing" }
  | { boundary: number; kind: "dragging" }
  | { boundary: number; kind: "snapped" };

/** The group's callbacks, with each layout ordered like the row's children. */
type ResizeEvent =
  | { boundary: number; type: "boundaryDown" }
  | { sizes: Array<number>; type: "layoutChange" }
  | { isUserInteraction: boolean; sizes: Array<number>; type: "layoutChanged" };

type ResizeContext = {
  resizableSplits: boolean;
  snap: SnapGrid;
  weights: Array<number>;
};

type ResizeEffect =
  | { sizes: Array<number>; type: "setLayout" }
  | { type: "settle"; weights: Array<number> };

type ResizeStep = { effect: ResizeEffect | null; state: ResizeState };

const IDLE: ResizeState = { kind: "idle" };
const SYNCING: ResizeState = { kind: "syncing" };

const boundaryOf = (state: ResizeState): number | null =>
  state.kind === "dragging" || state.kind === "snapped" ? state.boundary : null;

const snappedBoundaryOf = (state: ResizeState): number | null =>
  state.kind === "snapped" ? state.boundary : null;

const sizesMatch = (current: Array<number>, expected: Array<number>): boolean =>
  current.length === expected.length &&
  expected.every(
    (size, index) => Math.abs((current[index] ?? Number.NaN) - size) <= WEIGHT_EPSILON,
  );

const enter = (state: ResizeState): ResizeStep => ({ effect: null, state });

const stepResize = (state: ResizeState, event: ResizeEvent, context: ResizeContext): ResizeStep => {
  if (event.type === "boundaryDown") {
    return enter({ boundary: event.boundary, kind: "dragging" });
  }
  // rrp reports its mount-time measurement as a non-user layoutChanged;
  // committing it would rewrite the model before anyone touched a splitter.
  if (state.kind === "syncing" || (event.type === "layoutChanged" && !event.isUserInteraction)) {
    return enter(state);
  }

  const boundary = boundaryOf(state);
  if (event.type === "layoutChanged") {
    if (!context.resizableSplits) {
      return enter(IDLE);
    }
    const weights = settleSnap(event.sizes, boundary, context.snap);
    return {
      effect: sizesMatch(weights, context.weights) ? null : { type: "settle", weights },
      state: IDLE,
    };
  }

  if (!context.resizableSplits || boundary === null) {
    return enter(state);
  }
  const decision = decideSnap(event.sizes, boundary, context.snap);
  if (decision.kind === "inactive") {
    return enter(state);
  }
  if (decision.kind === "clear") {
    return enter({ boundary, kind: "dragging" });
  }
  return {
    effect: sizesMatch(event.sizes, decision.sizes)
      ? null
      : { sizes: decision.sizes, type: "setLayout" },
    state: { boundary, kind: "snapped" },
  };
};

const sizesFromLayout = (layout: Layout, children: RowChildren): Array<number> =>
  children.map((child) => layout[child.id] ?? child.weight);

const layoutFromSizes = (sizes: Array<number>, children: RowChildren): Layout =>
  children.reduce<Layout>((layout, child, index) => {
    layout[child.id] = sizes[index] ?? 0;
    return layout;
  }, {});

const percentagesOf = (children: RowChildren): Array<number> => {
  const total = children.reduce((sum, child) => sum + child.weight, 0);
  return children.map((child) => (child.weight / total) * 100);
};

type SnapResizeOptions = {
  children: RowChildren;
  onWeightsSettled: (weights: Array<number>) => void;
  resizableSplits: boolean;
  snap: SnapGrid;
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

  const commit = useCallback((next: ResizeState): void => {
    state.current = next;
    setSnappedBoundary(snappedBoundaryOf(next));
  }, []);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return undefined;
    }
    const current = group.getLayout();
    const desired = percentagesOf(children);
    const samePanelSet =
      Object.keys(current).length === children.length &&
      children.every((child) => child.id in current);
    if (!samePanelSet || sizesMatch(sizesFromLayout(current, children), desired)) {
      return undefined;
    }

    commit(SYNCING);
    group.setLayout(layoutFromSizes(desired, children));
    const frame = requestAnimationFrame(() => {
      commit(IDLE);
    });
    return () => {
      cancelAnimationFrame(frame);
      commit(IDLE);
    };
  }, [children, commit]);

  const handle = (event: ResizeEvent): void => {
    const { effect, state: next } = stepResize(state.current, event, {
      resizableSplits,
      snap,
      weights: children.map((child) => child.weight),
    });
    if (next !== state.current) {
      commit(next);
    }
    if (effect?.type === "settle") {
      onWeightsSettled(effect.weights);
      return;
    }
    const group = groupRef.current;
    if (effect?.type !== "setLayout" || !group) {
      return;
    }
    commit(SYNCING);
    group.setLayout(layoutFromSizes(effect.sizes, children));
    commit(next);
  };

  return {
    beginBoundaryDrag: (boundary) => {
      handle({ boundary, type: "boundaryDown" });
    },
    groupRef,
    onLayoutChange: (layout) => {
      handle({ sizes: sizesFromLayout(layout, children), type: "layoutChange" });
    },
    onLayoutChanged: (layout, meta) => {
      handle({
        isUserInteraction: meta.isUserInteraction,
        sizes: sizesFromLayout(layout, children),
        type: "layoutChanged",
      });
    },
    snappedBoundary,
  };
};

export { stepResize, useSnapResize };
export type {
  ResizeContext,
  ResizeEffect,
  ResizeEvent,
  ResizeState,
  SnapResize,
  SnapResizeOptions,
};

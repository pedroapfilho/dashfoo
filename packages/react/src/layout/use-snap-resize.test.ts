import { resolveSnapGrid } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import type { ResizeContext, ResizeEffect, ResizeEvent, ResizeState } from "./use-snap-resize";
import { stepResize } from "./use-snap-resize";

const IDLE: ResizeState = { kind: "idle" };

const SNAP_CONTEXT: ResizeContext = {
  resizableSplits: true,
  snap: resolveSnapGrid({ step: 25 }, 2),
  weights: [50, 50],
};

const FREE_CONTEXT: ResizeContext = { ...SNAP_CONTEXT, snap: resolveSnapGrid(null, 2) };

const run = (
  events: Array<ResizeEvent>,
  context: ResizeContext,
  start: ResizeState = IDLE,
): { effects: Array<ResizeEffect>; state: ResizeState } =>
  events.reduce<{ effects: Array<ResizeEffect>; state: ResizeState }>(
    (acc, event) => {
      const { effect, state } = stepResize(acc.state, event, context);

      return { effects: effect ? [...acc.effects, effect] : acc.effects, state };
    },
    { effects: [], state: start },
  );

const down = (boundary: number): ResizeEvent => ({ boundary, type: "boundaryDown" });
const move = (sizes: Array<number>): ResizeEvent => ({ sizes, type: "layoutChange" });

const release = (sizes: Array<number>): ResizeEvent => ({
  isUserInteraction: true,
  sizes,
  type: "layoutChanged",
});

const measured = (sizes: Array<number>): ResizeEvent => ({
  isUserInteraction: false,
  sizes,
  type: "layoutChanged",
});

describe("stepResize", () => {
  test("ignores the mount-time layout measurement", () => {
    expect(run([measured([70, 30])], SNAP_CONTEXT)).toEqual({ effects: [], state: IDLE });
  });

  test("ignores a non-user layoutChanged mid-drag", () => {
    const dragging: ResizeState = { boundary: 0, kind: "dragging" };
    expect(run([measured([70, 30])], SNAP_CONTEXT, dragging)).toEqual({
      effects: [],
      state: dragging,
    });
  });

  test("ignores the group's echo of its own writes while syncing", () => {
    const syncing: ResizeState = { kind: "syncing" };
    expect(run([move([70, 30]), release([70, 30])], SNAP_CONTEXT, syncing)).toEqual({
      effects: [],
      state: syncing,
    });
  });

  test("a user drag settles the weights once, on release", () => {
    const result = run(
      [down(0), move([55, 45]), move([62, 38]), move([65, 35]), release([65, 35])],
      FREE_CONTEXT,
    );

    expect(result).toEqual({ effects: [{ type: "settle", weights: [65, 35] }], state: IDLE });
  });

  test("a release that lands on the current weights settles nothing", () => {
    expect(run([down(0), move([60, 40]), release([50, 50])], FREE_CONTEXT)).toEqual({
      effects: [],
      state: IDLE,
    });
  });

  test("moves outside a drag never snap", () => {
    expect(run([move([52, 48])], SNAP_CONTEXT)).toEqual({ effects: [], state: IDLE });
  });

  test("snaps in near a snap point and pulls the layout onto it", () => {
    expect(run([down(0), move([52, 48])], SNAP_CONTEXT)).toEqual({
      effects: [{ sizes: [50, 50], type: "setLayout" }],
      state: { boundary: 0, kind: "snapped" },
    });
  });

  test("stays snapped without another write once the layout sits on the point", () => {
    expect(run([down(0), move([52, 48]), move([50, 50])], SNAP_CONTEXT)).toEqual({
      effects: [{ sizes: [50, 50], type: "setLayout" }],
      state: { boundary: 0, kind: "snapped" },
    });
  });

  test("snaps out once the boundary leaves the threshold", () => {
    expect(run([down(0), move([52, 48]), move([60, 40])], SNAP_CONTEXT)).toEqual({
      effects: [{ sizes: [50, 50], type: "setLayout" }],
      state: { boundary: 0, kind: "dragging" },
    });
  });

  test("releasing while snapped settles on the snap point", () => {
    const snapped: ResizeState = { boundary: 0, kind: "snapped" };
    expect(run([release([47, 53])], { ...SNAP_CONTEXT, weights: [30, 70] }, snapped)).toEqual({
      effects: [{ type: "settle", weights: [50, 50] }],
      state: IDLE,
    });
  });

  test("never snaps or settles when splits are not resizable", () => {
    const context: ResizeContext = { ...SNAP_CONTEXT, resizableSplits: false };
    expect(run([down(0), move([52, 48]), release([52, 48])], context)).toEqual({
      effects: [],
      state: IDLE,
    });
  });
});

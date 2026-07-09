import { describe, expect, test } from "vitest";

import { resolveSnapTargets, snapEnabled, snapSizes } from "./snap";

const round2 = (value: number): number => Math.round(value * 100) / 100;

describe("resolveSnapTargets", () => {
  test("builds a fixed grid from `step`", () => {
    expect(resolveSnapTargets({ step: 25 }, 2)).toEqual([25, 50, 75]);
  });

  test("handles a fine step grid", () => {
    expect(resolveSnapTargets({ step: 10 }, 2)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });

  test("excludes 100 when the step divides it evenly", () => {
    expect(resolveSnapTargets({ step: 50 }, 2)).toEqual([50]);
  });

  test("builds an even-split grid from a fixed `divisions`", () => {
    expect(resolveSnapTargets({ divisions: 3 }, 2).map(round2)).toEqual([33.33, 66.67]);
    expect(resolveSnapTargets({ divisions: 4 }, 2)).toEqual([25, 50, 75]);
  });

  test("divisions: 'panels' divides by the row's panel count", () => {
    expect(resolveSnapTargets({ divisions: "panels" }, 3).map(round2)).toEqual([33.33, 66.67]);
    expect(resolveSnapTargets({ divisions: "panels" }, 4)).toEqual([25, 50, 75]);
    expect(resolveSnapTargets({ divisions: "panels" }, 2)).toEqual([50]);
  });

  test("unions the step and divisions grids, sorted and deduped", () => {
    expect(resolveSnapTargets({ divisions: 3, step: 25 }, 2).map(round2)).toEqual([
      25, 33.33, 50, 66.67, 75,
    ]);

    expect(resolveSnapTargets({ divisions: 4, step: 25 }, 2)).toEqual([25, 50, 75]);
  });

  test("returns nothing when nothing is configured or the grid is empty", () => {
    expect(resolveSnapTargets({}, 3)).toEqual([]);
    expect(resolveSnapTargets({ step: 0 }, 3)).toEqual([]);
    expect(resolveSnapTargets({ step: 100 }, 3)).toEqual([]);
    expect(resolveSnapTargets({ divisions: 1 }, 3)).toEqual([]);
  });
});

describe("snapEnabled", () => {
  test("is true when a fixed step is set", () => {
    expect(snapEnabled({ step: 25 })).toBe(true);
  });

  test("is true for fixed or panel-count divisions", () => {
    expect(snapEnabled({ divisions: 3 })).toBe(true);
    expect(snapEnabled({ divisions: "panels" })).toBe(true);
  });

  test("is false when nothing meaningful is configured", () => {
    expect(snapEnabled(null)).toBe(false);
    expect(snapEnabled({})).toBe(false);
    expect(snapEnabled({ step: 0 })).toBe(false);
    expect(snapEnabled({ divisions: 1 })).toBe(false);
  });
});

describe("snapSizes", () => {
  test("pulls a boundary to the nearest grid target within the threshold", () => {
    expect(snapSizes([48, 52], 0, { step: 25, threshold: 4 })).toEqual({
      sizes: [50, 50],
      snapped: true,
    });
  });

  test("snaps with a negative delta when the boundary sits past the target", () => {
    expect(snapSizes([52, 48], 0, { step: 25, threshold: 4 })).toEqual({
      sizes: [50, 50],
      snapped: true,
    });
  });

  test("leaves the layout untouched when no target is within the threshold", () => {
    expect(snapSizes([40, 60], 0, { step: 25, threshold: 4 })).toEqual({
      sizes: [40, 60],
      snapped: false,
    });
  });

  test("snaps a two-panel row to a third with fixed divisions", () => {
    const result = snapSizes([35, 65], 0, { divisions: 3, threshold: 4 });
    expect(result.snapped).toBe(true);
    expect(result.sizes.map(round2)).toEqual([33.33, 66.67]);
  });

  test("snaps a three-panel row to even thirds via divisions: 'panels'", () => {
    const result = snapSizes([30, 35, 35], 0, { divisions: "panels", threshold: 4 });
    expect(result.snapped).toBe(true);

    expect(result.sizes.map(round2)).toEqual([33.33, 31.67, 35]);
  });

  test("snaps a four-panel row to a quarter via divisions: 'panels'", () => {
    const result = snapSizes([22, 28, 25, 25], 0, { divisions: "panels", threshold: 4 });
    expect(result.snapped).toBe(true);
    expect(result.sizes).toEqual([25, 25, 25, 25]);
  });

  test("redistributes only across the dragged boundary's pair, leaving siblings", () => {
    expect(snapSizes([20, 28, 52], 1, { step: 25, threshold: 4 })).toEqual({
      sizes: [20, 30, 50],
      snapped: true,
    });
  });

  test("uses the default threshold when none is given", () => {
    expect(snapSizes([48, 52], 0, { step: 25 })).toEqual({ sizes: [50, 50], snapped: true });
  });

  test("respects a tighter custom threshold", () => {
    expect(snapSizes([48, 52], 0, { step: 25, threshold: 1 })).toEqual({
      sizes: [48, 52],
      snapped: false,
    });
  });

  test("is a no-op when nothing is configured", () => {
    expect(snapSizes([48, 52], 0, {})).toEqual({ sizes: [48, 52], snapped: false });
  });

  test("is a no-op when the step is zero (per-row disable)", () => {
    expect(snapSizes([48, 52], 0, { step: 0 })).toEqual({ sizes: [48, 52], snapped: false });
  });

  test("is a no-op for an out-of-range boundary index", () => {
    expect(snapSizes([50, 50], 1, { step: 25 })).toEqual({ sizes: [50, 50], snapped: false });
    expect(snapSizes([50, 50], -1, { step: 25 })).toEqual({ sizes: [50, 50], snapped: false });
  });

  test("snaps a boundary that sits near the low end of the range", () => {
    expect(snapSizes([1, 99], 0, { step: 5, threshold: 4 })).toEqual({
      sizes: [5, 95],
      snapped: true,
    });
  });

  test("does not snap when the correction would drive an adjacent panel negative", () => {
    expect(snapSizes([23, 1, 76], 0, { step: 25, threshold: 4 })).toEqual({
      sizes: [23, 1, 76],
      snapped: false,
    });
  });
});

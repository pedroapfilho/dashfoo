import type { Rect } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import { insertionIndex, insertionLineRect, pointInRect, shouldAllowDrop } from "./tab-insertion";

const r = (x: number, width: number): Rect => ({ height: 30, width, x, y: 0 });

const item = (x: number): Rect => ({ height: 30, width: 60, x, y: 8 });

describe("pointInRect", () => {
  const rect: Rect = { height: 100, width: 200, x: 10, y: 20 };

  test("inside", () => {
    expect(pointInRect({ x: 100, y: 60 }, rect)).toBe(true);
  });

  test("on the edge counts as inside", () => {
    expect(pointInRect({ x: 10, y: 20 }, rect)).toBe(true);
    expect(pointInRect({ x: 210, y: 120 }, rect)).toBe(true);
  });

  test("outside", () => {
    expect(pointInRect({ x: 9, y: 60 }, rect)).toBe(false);
    expect(pointInRect({ x: 100, y: 121 }, rect)).toBe(false);
  });
});

describe("insertionIndex", () => {
  const rects = [r(0, 40), r(40, 40), r(80, 40)];

  test("left of the first midpoint inserts at 0", () => {
    expect(insertionIndex(rects, 5)).toBe(0);
  });

  test("past the first midpoint, before the second, inserts at 1", () => {
    expect(insertionIndex(rects, 50)).toBe(1);
  });

  test("past every midpoint inserts at the end", () => {
    expect(insertionIndex(rects, 200)).toBe(3);
  });

  test("no tabs inserts at 0", () => {
    expect(insertionIndex([], 50)).toBe(0);
  });
});

describe("insertionLineRect", () => {
  const strip: Rect = { height: 36, width: 300, x: 10, y: 5 };
  const items = [item(10), item(70), item(130)];

  test("before a given tab centers the line on that tab-item's left edge", () => {
    expect(insertionLineRect(strip, items, 1)).toEqual({
      height: 36,
      width: 4,
      x: 68,
      y: 5,
    });
  });

  test("at the end sits past the last tab-item, spanning the strip height", () => {
    expect(insertionLineRect(strip, items, 3)).toEqual({
      height: 36,
      width: 4,
      x: 188,
      y: 5,
    });
  });

  test("no tabs rests at the strip start, clamped inside the strip", () => {
    expect(insertionLineRect(strip, [], 0)).toEqual({
      height: 36,
      width: 4,
      x: 10,
      y: 5,
    });
  });

  test("clamps to the strip's right edge when the boundary sits at the strip end", () => {
    const fullItems = [item(10), item(70), item(250)];
    expect(insertionLineRect(strip, fullItems, 3)).toEqual({
      height: 36,
      width: 4,
      x: 306,
      y: 5,
    });
  });
});

describe("shouldAllowDrop", () => {
  test("a tabset dragged onto its own tabset is a no-op", () => {
    expect(shouldAllowDrop("grip-ts1", "ts1", ["a", "b"])).toBe(false);
  });

  test("the sole tab of a tabset dropped back onto it is a no-op", () => {
    expect(shouldAllowDrop("only", "ts1", ["only"])).toBe(false);
  });

  test("a sole tab onto a different tabset is allowed", () => {
    expect(shouldAllowDrop("only", "ts2", ["other"])).toBe(true);
  });

  test("one of several tabs onto its own tabset is allowed (a real reorder/split)", () => {
    expect(shouldAllowDrop("a", "ts1", ["a", "b"])).toBe(true);
  });
});

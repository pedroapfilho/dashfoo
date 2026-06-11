import type { Rect } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import { insertionGhostRect, insertionIndex, pointInRect, shouldAllowDrop } from "./tab-insertion";

const r = (x: number, width: number): Rect => ({ height: 30, width, x, y: 0 });

// a tab-item resting inside a taller strip (y=8, height=30), 60 wide
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
  // three tabs: [0,40) [40,80) [80,120)
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

describe("insertionGhostRect", () => {
  const strip: Rect = { height: 36, width: 300, x: 10, y: 5 };
  const items = [item(10), item(70), item(130)]; // last item ends at x=190
  const size = { height: 28, width: 60 };

  test("before a given tab takes that tab-item's slot and vertical box", () => {
    expect(insertionGhostRect(strip, items, 1, size)).toEqual({
      height: 30,
      width: 60,
      x: 70,
      y: 8,
    });
  });

  test("at the end starts past the last tab-item, anchored to its vertical box", () => {
    expect(insertionGhostRect(strip, items, 3, size)).toEqual({
      height: 30,
      width: 60,
      x: 190,
      y: 8,
    });
  });

  test("no tabs falls back to the dragged tab's height, resting on the strip bottom", () => {
    expect(insertionGhostRect(strip, [], 0, size)).toEqual({
      height: 28,
      width: 60,
      x: 10,
      y: 13, // strip bottom (5 + 36) minus the tab height
    });
  });

  test("clamps to the strip's right edge when the slot would overflow", () => {
    // boundary at x=190, but a 130-wide ghost must not pass the strip end (x=310)
    expect(insertionGhostRect(strip, items, 3, { height: 28, width: 130 })).toEqual({
      height: 30,
      width: 130,
      x: 180,
      y: 8,
    });
  });

  test("a tab wider than the strip is clamped to the strip itself", () => {
    expect(insertionGhostRect(strip, items, 0, { height: 28, width: 500 })).toEqual({
      height: 30,
      width: 300,
      x: 10,
      y: 8,
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

import { describe, expect, test } from "vitest";

import type { Rect } from "./geometry";
import { resolveDockTarget, zoneRect } from "./geometry";

const rect: Rect = { height: 100, width: 200, x: 0, y: 0 };

describe("resolveDockTarget", () => {
  test("returns a tab drop when the pointer is in the center region", () => {
    expect(resolveDockTarget({ x: 100, y: 50 }, rect)).toEqual({ kind: "tab" });
  });

  test("returns a left split near the left edge", () => {
    expect(resolveDockTarget({ x: 10, y: 50 }, rect)).toEqual({ edge: "left", kind: "split" });
  });

  test("returns a right split near the right edge", () => {
    expect(resolveDockTarget({ x: 190, y: 50 }, rect)).toEqual({ edge: "right", kind: "split" });
  });

  test("returns a bottom split near the bottom edge", () => {
    expect(resolveDockTarget({ x: 100, y: 95 }, rect)).toEqual({ edge: "bottom", kind: "split" });
  });

  test("in a corner, picks the closer edge", () => {
    expect(resolveDockTarget({ x: 30, y: 5 }, rect)).toEqual({ edge: "top", kind: "split" });
  });

  test("honors a custom band fraction (smaller band keeps more of the area as tab)", () => {
    expect(resolveDockTarget({ x: 30, y: 50 }, rect, { bandFraction: 0.1 })).toEqual({
      kind: "tab",
    });
  });

  test("falls back to a tab drop for a zero-size rect", () => {
    expect(resolveDockTarget({ x: 0, y: 0 }, { height: 0, width: 0, x: 0, y: 0 })).toEqual({
      kind: "tab",
    });
  });
});

describe("zoneRect", () => {
  const r: Rect = { height: 100, width: 200, x: 10, y: 20 };

  test("center highlights the whole tabset", () => {
    expect(zoneRect(r, "center")).toEqual(r);
  });

  test("split-left highlights the left half", () => {
    expect(zoneRect(r, "split-left")).toEqual({ height: 100, width: 100, x: 10, y: 20 });
  });

  test("split-right highlights the right half", () => {
    expect(zoneRect(r, "split-right")).toEqual({ height: 100, width: 100, x: 110, y: 20 });
  });

  test("split-bottom highlights the bottom half", () => {
    expect(zoneRect(r, "split-bottom")).toEqual({ height: 50, width: 200, x: 10, y: 70 });
  });

  test("split-top highlights the top half", () => {
    expect(zoneRect(r, "split-top")).toEqual({ height: 50, width: 200, x: 10, y: 20 });
  });
});

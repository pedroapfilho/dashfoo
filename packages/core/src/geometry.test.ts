import { describe, expect, test } from "vitest";

import type { Rect } from "./geometry";
import { resolveBorderEdge, resolveDockTarget } from "./geometry";

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
});

describe("resolveBorderEdge", () => {
  const frame: Rect = { height: 1000, width: 1000, x: 0, y: 0 };

  test("detects the left frame edge", () => {
    expect(resolveBorderEdge({ x: 20, y: 500 }, frame)).toBe("left");
  });

  test("detects the bottom frame edge", () => {
    expect(resolveBorderEdge({ x: 500, y: 980 }, frame)).toBe("bottom");
  });

  test("returns null in the interior", () => {
    expect(resolveBorderEdge({ x: 500, y: 500 }, frame)).toBeNull();
  });

  test("returns null outside the frame", () => {
    expect(resolveBorderEdge({ x: -10, y: 500 }, frame)).toBeNull();
  });
});

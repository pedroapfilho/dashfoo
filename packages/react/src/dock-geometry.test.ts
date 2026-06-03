import type { Rect } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import { computeDropIntent, zoneRect } from "./dock-geometry";

const rect: Rect = { height: 100, width: 200, x: 0, y: 0 };

describe("computeDropIntent", () => {
  test("center of a tabset stacks as a tab", () => {
    expect(computeDropIntent("ts1", rect, { x: 100, y: 50 })).toEqual({
      location: "center",
      targetId: "ts1",
    });
  });

  test("near the left edge splits left", () => {
    expect(computeDropIntent("ts1", rect, { x: 10, y: 50 })).toEqual({
      location: "split-left",
      targetId: "ts1",
    });
  });

  test("near the bottom edge splits bottom", () => {
    expect(computeDropIntent("ts1", rect, { x: 100, y: 95 })).toEqual({
      location: "split-bottom",
      targetId: "ts1",
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
});

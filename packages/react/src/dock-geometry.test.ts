import type { Rect } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import { borderZoneRect, computeDropIntent, frameEdgeIntent, zoneRect } from "./dock-geometry";

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

describe("frameEdgeIntent", () => {
  const frame: Rect = { height: 100, width: 200, x: 0, y: 0 };

  test("the outer left sliver docks as a left border", () => {
    expect(frameEdgeIntent(frame, { x: 4, y: 50 })).toEqual({
      location: "border-left",
      targetId: "",
    });
  });

  test("the outer top sliver docks as a top border", () => {
    expect(frameEdgeIntent(frame, { x: 100, y: 2 })).toEqual({
      location: "border-top",
      targetId: "",
    });
  });

  test("the interior is not a border target", () => {
    expect(frameEdgeIntent(frame, { x: 100, y: 50 })).toBeNull();
  });
});

describe("borderZoneRect", () => {
  const frame: Rect = { height: 100, width: 200, x: 10, y: 20 };

  test("border-left is a strip down the left edge", () => {
    expect(borderZoneRect(frame, "border-left")).toEqual({ height: 100, width: 16, x: 10, y: 20 });
  });

  test("border-bottom is a strip along the bottom edge", () => {
    expect(borderZoneRect(frame, "border-bottom")).toEqual({
      height: 8,
      width: 200,
      x: 10,
      y: 112,
    });
  });
});

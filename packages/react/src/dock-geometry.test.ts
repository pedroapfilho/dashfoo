import type { Rect } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import { computeDropIntent } from "./dock-geometry";

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

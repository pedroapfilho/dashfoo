import { describe, expect, test } from "vitest";

import type { BandOptions, Point, Rect } from "./geometry";
import { dockZonePolygons, resolveDockTarget, zoneRect } from "./geometry";

const rect: Rect = { height: 100, width: 200, x: 0, y: 0 };

describe("resolveDockTarget", () => {
  test("returns a tab drop when the pointer is in the center region", () => {
    expect(resolveDockTarget({ x: 100, y: 50 }, rect)).toBe("center");
  });

  test("returns a left split near the left edge", () => {
    expect(resolveDockTarget({ x: 10, y: 50 }, rect)).toBe("split-left");
  });

  test("returns a right split near the right edge", () => {
    expect(resolveDockTarget({ x: 190, y: 50 }, rect)).toBe("split-right");
  });

  test("returns a bottom split near the bottom edge", () => {
    expect(resolveDockTarget({ x: 100, y: 95 }, rect)).toBe("split-bottom");
  });

  test("in a corner, picks the closer edge", () => {
    expect(resolveDockTarget({ x: 30, y: 5 }, rect)).toBe("split-top");
  });

  test("honors a custom band fraction (smaller band keeps more of the area as tab)", () => {
    expect(resolveDockTarget({ x: 30, y: 50 }, rect, { bandFraction: 0.1 })).toBe("center");
  });

  test("falls back to a tab drop for a zero-size rect", () => {
    expect(resolveDockTarget({ x: 0, y: 0 }, { height: 0, width: 0, x: 0, y: 0 })).toBe("center");
  });
});

const centroid = (points: ReadonlyArray<Point>): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

const interiorSamples = (points: ReadonlyArray<Point>): Array<Point> => {
  const c = centroid(points);
  return [
    c,
    ...points.flatMap((vertex) =>
      [0.5, 0.9, 0.99].map((t) => ({
        x: c.x + t * (vertex.x - c.x),
        y: c.y + t * (vertex.y - c.y),
      })),
    ),
  ];
};

describe("dockZonePolygons", () => {
  const rects: Array<Rect> = [
    { height: 100, width: 200, x: 0, y: 0 },
    { height: 320, width: 180, x: 40, y: 60 },
    { height: 50, width: 900, x: -120, y: 8 },
  ];

  test.each(rects)("every interior point agrees with resolveDockTarget (%j)", (r) => {
    for (const zone of dockZonePolygons(r)) {
      for (const point of interiorSamples(zone.points)) {
        expect(resolveDockTarget(point, r)).toBe(zone.location);
      }
    }
  });

  test("honors a custom band fraction", () => {
    const r: Rect = { height: 100, width: 200, x: 0, y: 0 };
    const opts: BandOptions = { bandFraction: 0.1 };
    for (const zone of dockZonePolygons(r, opts)) {
      for (const point of interiorSamples(zone.points)) {
        expect(resolveDockTarget(point, r, opts)).toBe(zone.location);
      }
    }
  });

  test("partitions the rect: five zones, trapezoid seams meet the inner corners", () => {
    const zones = dockZonePolygons({ height: 100, width: 200, x: 10, y: 20 });
    expect(zones.map((zone) => zone.location)).toEqual([
      "center",
      "split-left",
      "split-right",
      "split-top",
      "split-bottom",
    ]);
    const center = zones[0];
    expect(center?.points).toEqual([
      { x: 54, y: 42 },
      { x: 166, y: 42 },
      { x: 166, y: 98 },
      { x: 54, y: 98 },
    ]);
  });

  test("collapses to a single center polygon for a zero-size rect", () => {
    expect(dockZonePolygons({ height: 0, width: 0, x: 5, y: 5 })).toEqual([
      {
        location: "center",
        points: [
          { x: 5, y: 5 },
          { x: 5, y: 5 },
          { x: 5, y: 5 },
          { x: 5, y: 5 },
        ],
      },
    ]);
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

import type { DockLocation, Point, Rect } from "@dashfoo/core";
import { dockZonePolygons, resolveDockTarget } from "@dashfoo/core";

type TabsetMeasurement = {
  rect: Rect;
  strip: Rect | null;

  tabMidpoints: Array<number>;
};

type ZoneCell =
  | { kind: "dock"; location: DockLocation; points: Array<Point>; tabsetIndex: number }
  | { kind: "slot"; points: Array<Point>; slotIndex: number; tabsetIndex: number };

const rectPolygon = (rect: Rect): Array<Point> => [
  { x: rect.x, y: rect.y },
  { x: rect.x + rect.width, y: rect.y },
  { x: rect.x + rect.width, y: rect.y + rect.height },
  { x: rect.x, y: rect.y + rect.height },
];

const slotCells = (strip: Rect, midpoints: Array<number>, tabsetIndex: number): Array<ZoneCell> => {
  const bounds = [strip.x, ...midpoints, strip.x + strip.width];
  return bounds.slice(0, -1).map((left, slotIndex) => {
    const right = bounds[slotIndex + 1] ?? strip.x + strip.width;
    return {
      kind: "slot",
      points: rectPolygon({ height: strip.height, width: right - left, x: left, y: strip.y }),
      slotIndex,
      tabsetIndex,
    };
  });
};

const buildZoneMap = (tabsets: Array<TabsetMeasurement>): Array<ZoneCell> =>
  tabsets.flatMap((tabset, tabsetIndex) => [
    ...dockZonePolygons(tabset.rect).map<ZoneCell>(({ location, points }) => ({
      kind: "dock",
      location,
      points,
      tabsetIndex,
    })),
    ...(tabset.strip ? slotCells(tabset.strip, tabset.tabMidpoints, tabsetIndex) : []),
  ]);

const inRect = (point: Point, rect: Rect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

type ActiveCell =
  | { kind: "dock"; location: DockLocation; tabsetIndex: number }
  | { kind: "slot"; slotIndex: number; tabsetIndex: number };

const activeCellAt = (tabsets: Array<TabsetMeasurement>, point: Point): ActiveCell | null => {
  const tabsetIndex = tabsets.findIndex((tabset) => inRect(point, tabset.rect));
  const tabset = tabsets.at(tabsetIndex);
  if (tabsetIndex === -1 || !tabset) {
    return null;
  }
  if (tabset.strip && inRect(point, tabset.strip)) {
    const after = tabset.tabMidpoints.findIndex((mid) => point.x < mid);
    return {
      kind: "slot",
      slotIndex: after === -1 ? tabset.tabMidpoints.length : after,
      tabsetIndex,
    };
  }
  const target = resolveDockTarget(point, tabset.rect);
  return {
    kind: "dock",
    location: target.kind === "tab" ? "center" : `split-${target.edge}`,
    tabsetIndex,
  };
};

const cellKey = (cell: ActiveCell | ZoneCell): string =>
  cell.kind === "dock"
    ? `${cell.tabsetIndex}:dock:${cell.location}`
    : `${cell.tabsetIndex}:slot:${cell.slotIndex}`;

export { activeCellAt, buildZoneMap, cellKey };
export type { ActiveCell, TabsetMeasurement, ZoneCell };

import type { DockLocation, SplitLocation } from "../model/dock-location";
import { SPLIT_PLACEMENT } from "../model/dock-location";

type Point = { x: number; y: number };

type Rect = { height: number; width: number; x: number; y: number };

type DockZone = { location: DockLocation; points: Array<Point> };

type EdgeDistances = { bottom: number; left: number; right: number; top: number };

/** The share of a tabset's width or height, from each edge, that splits instead of stacking. */
const BAND_FRACTION = 0.22;

const edgeDistances = (pointer: Point, rect: Rect): EdgeDistances => {
  const fx = (pointer.x - rect.x) / rect.width;
  const fy = (pointer.y - rect.y) / rect.height;

  return { bottom: 1 - fy, left: fx, right: 1 - fx, top: fy };
};

const closestSplit = (d: EdgeDistances): SplitLocation => {
  const min = Math.min(d.left, d.right, d.top, d.bottom);

  if (min === d.left) {
    return "split-left";
  }

  if (min === d.right) {
    return "split-right";
  }

  if (min === d.top) {
    return "split-top";
  }

  return "split-bottom";
};

const resolveDockTarget = (pointer: Point, rect: Rect): DockLocation => {
  if (rect.width <= 0 || rect.height <= 0) {
    return "center";
  }

  const distances = edgeDistances(pointer, rect);
  const min = Math.min(distances.left, distances.right, distances.top, distances.bottom);

  if (min > BAND_FRACTION) {
    return "center";
  }

  return closestSplit(distances);
};

const dockZonePolygons = (rect: Rect): Array<DockZone> => {
  const { height: h, width: w, x, y } = rect;
  const nw: Point = { x, y };
  const ne: Point = { x: x + w, y };
  const se: Point = { x: x + w, y: y + h };
  const sw: Point = { x, y: y + h };

  if (w <= 0 || h <= 0) {
    return [{ location: "center", points: [nw, ne, se, sw] }];
  }

  const bx = BAND_FRACTION * w;
  const by = BAND_FRACTION * h;
  const innerNw: Point = { x: x + bx, y: y + by };
  const innerNe: Point = { x: x + w - bx, y: y + by };
  const innerSe: Point = { x: x + w - bx, y: y + h - by };
  const innerSw: Point = { x: x + bx, y: y + h - by };

  return [
    { location: "center", points: [innerNw, innerNe, innerSe, innerSw] },
    { location: "split-left", points: [nw, innerNw, innerSw, sw] },
    { location: "split-right", points: [ne, se, innerSe, innerNe] },
    { location: "split-top", points: [nw, ne, innerNe, innerNw] },
    { location: "split-bottom", points: [sw, innerSw, innerSe, se] },
  ];
};

/** Built field by field: a `DOMRect`'s fields are prototype getters, so a spread copies none of them. */
const zoneRect = (rect: Rect, location: DockLocation): Rect => {
  if (location === "center") {
    return rect;
  }

  const { before, orientation } = SPLIT_PLACEMENT[location];

  if (orientation === "row") {
    const width = rect.width / 2;

    return { height: rect.height, width, x: before ? rect.x : rect.x + width, y: rect.y };
  }

  const height = rect.height / 2;

  return { height, width: rect.width, x: rect.x, y: before ? rect.y : rect.y + height };
};

export { dockZonePolygons, resolveDockTarget, zoneRect };

export type { DockZone, Point, Rect };

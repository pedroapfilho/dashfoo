import type { Edge } from "./schema";

type Point = { x: number; y: number };
type Rect = { height: number; width: number; x: number; y: number };
type DockTarget = { kind: "tab" } | { edge: Edge; kind: "split" };
type BandOptions = { bandFraction?: number };

// Fractional distance of the pointer from each of the four edges of a rect.
const edgeDistances = (
  pointer: Point,
  rect: Rect,
): { bottom: number; left: number; right: number; top: number } => {
  const fx = (pointer.x - rect.x) / rect.width;
  const fy = (pointer.y - rect.y) / rect.height;
  return { bottom: 1 - fy, left: fx, right: 1 - fx, top: fy };
};

const closestEdge = (d: { bottom: number; left: number; right: number; top: number }): Edge => {
  const min = Math.min(d.left, d.right, d.top, d.bottom);
  if (min === d.left) {
    return "left";
  }
  if (min === d.right) {
    return "right";
  }
  if (min === d.top) {
    return "top";
  }
  return "bottom";
};

// Where a drag dropped over a tabset should land: stacked as a tab when the
// pointer is in the center, or splitting the tabset when it is within an outer
// band (default 22%) of one of the four edges — the closer edge wins in corners.
const resolveDockTarget = (pointer: Point, rect: Rect, opts?: BandOptions): DockTarget => {
  const band = opts?.bandFraction ?? 0.22;
  const distances = edgeDistances(pointer, rect);
  const min = Math.min(distances.left, distances.right, distances.top, distances.bottom);

  if (min > band) {
    return { kind: "tab" };
  }
  return { edge: closestEdge(distances), kind: "split" };
};

export { resolveDockTarget };
export type { BandOptions, DockTarget, Point, Rect };

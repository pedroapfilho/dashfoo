import type { ResizeEdges } from "../lib/float-geometry";

const RESIZE_HANDLES: ReadonlyArray<{ edges: ResizeEdges; key: string }> = [
  { edges: { x: 0, y: -1 }, key: "n" },
  { edges: { x: 0, y: 1 }, key: "s" },
  { edges: { x: 1, y: 0 }, key: "e" },
  { edges: { x: -1, y: 0 }, key: "w" },
  { edges: { x: 1, y: -1 }, key: "ne" },
  { edges: { x: -1, y: -1 }, key: "nw" },
  { edges: { x: 1, y: 1 }, key: "se" },
  { edges: { x: -1, y: 1 }, key: "sw" },
];
const EDGE_BY_KEY = new Map<string, ResizeEdges>(RESIZE_HANDLES.map((h) => [h.key, h.edges]));
export { EDGE_BY_KEY, RESIZE_HANDLES };

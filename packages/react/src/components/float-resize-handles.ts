import type { CSSProperties } from "react";

import type { ResizeEdges } from "../lib/float-geometry";

// Edge grab band straddles the frame border evenly (half outside, half inside)
// so the cursor lands on a real target whether the user aims slightly in or out.
const EDGE_THICKNESS = 12;
const EDGE_OFFSET = -(EDGE_THICKNESS / 2);
// Corners sit mostly outside the frame and are larger for a forgiving grab.
const CORNER_SIZE = 20;
const CORNER_OFFSET = -8;
// Each edge band starts where the corner handle ends, so the corner (painted
// later, same zIndex) keeps its zone while the band covers the rest of the side.
const EDGE_INSET = CORNER_SIZE + CORNER_OFFSET;

// data-edge encodes which edges the handle moves; style positions it on the frame.
const RESIZE_HANDLES: ReadonlyArray<{ edges: ResizeEdges; key: string; style: CSSProperties }> = [
  {
    edges: { x: 0, y: -1 },
    key: "n",
    style: {
      cursor: "ns-resize",
      height: EDGE_THICKNESS,
      insetInline: EDGE_INSET,
      top: EDGE_OFFSET,
    },
  },
  {
    edges: { x: 0, y: 1 },
    key: "s",
    style: {
      bottom: EDGE_OFFSET,
      cursor: "ns-resize",
      height: EDGE_THICKNESS,
      insetInline: EDGE_INSET,
    },
  },
  {
    edges: { x: 1, y: 0 },
    key: "e",
    style: {
      cursor: "ew-resize",
      insetBlock: EDGE_INSET,
      right: EDGE_OFFSET,
      width: EDGE_THICKNESS,
    },
  },
  {
    edges: { x: -1, y: 0 },
    key: "w",
    style: {
      cursor: "ew-resize",
      insetBlock: EDGE_INSET,
      left: EDGE_OFFSET,
      width: EDGE_THICKNESS,
    },
  },
  {
    edges: { x: 1, y: -1 },
    key: "ne",
    style: {
      cursor: "nesw-resize",
      height: CORNER_SIZE,
      right: CORNER_OFFSET,
      top: CORNER_OFFSET,
      width: CORNER_SIZE,
    },
  },
  {
    edges: { x: -1, y: -1 },
    key: "nw",
    style: {
      cursor: "nwse-resize",
      height: CORNER_SIZE,
      left: CORNER_OFFSET,
      top: CORNER_OFFSET,
      width: CORNER_SIZE,
    },
  },
  {
    edges: { x: 1, y: 1 },
    key: "se",
    style: {
      bottom: CORNER_OFFSET,
      cursor: "nwse-resize",
      height: CORNER_SIZE,
      right: CORNER_OFFSET,
      width: CORNER_SIZE,
    },
  },
  {
    edges: { x: -1, y: 1 },
    key: "sw",
    style: {
      bottom: CORNER_OFFSET,
      cursor: "nesw-resize",
      height: CORNER_SIZE,
      left: CORNER_OFFSET,
      width: CORNER_SIZE,
    },
  },
];

// Resolve a resize handle's data-edge back to its edges; a missing key (the title
// bar or the minimized chip) means a move, not a resize.
const EDGE_BY_KEY = new Map<string, ResizeEdges>(RESIZE_HANDLES.map((h) => [h.key, h.edges]));

export { EDGE_BY_KEY, RESIZE_HANDLES };

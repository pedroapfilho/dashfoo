import type { Geometry } from "@dashfoo/core";
import { DEFAULT_FLOAT_GEOMETRY } from "@dashfoo/core";

import { closestPart, ownPart, PART } from "../lib/parts";

const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;

const LIFT_OFFSET = 16;

type Size = { height: number; width: number };

type Scale = { x: number; y: number };

const ratio = (screen: number, layout: number): number =>
  screen > 0 && layout > 0 ? screen / layout : 1;

/** Screen pixels per layout pixel; 1 where the element has no layout box to compare. */
const layoutScale = (element: HTMLElement): Scale => {
  const rect = element.getBoundingClientRect();

  return {
    x: ratio(rect.width, element.offsetWidth),
    y: ratio(rect.height, element.offsetHeight),
  };
};

/** A screen rect as layout pixels relative to `origin`, the positioned ancestor's screen rect. */
const toLayoutRect = (rect: DOMRect, origin: DOMRect | undefined, scale: Scale): Geometry => ({
  height: rect.height / scale.y,
  left: (rect.left - (origin?.left ?? 0)) / scale.x,
  top: (rect.top - (origin?.top ?? 0)) / scale.y,
  width: rect.width / scale.x,
});

const clampToBounds = (rect: Geometry, bounds: Size, size: Size = rect): Geometry => ({
  height: rect.height,
  left: Math.max(0, Math.min(rect.left, Math.max(0, bounds.width - size.width))),
  top: Math.max(0, Math.min(rect.top, Math.max(0, bounds.height - size.height))),
  width: rect.width,
});

/** The float overlay of the layout `element` sits in, not of a layout nested inside it. */
const ownFloatOverlay = (element: Element): HTMLElement | undefined => {
  const layout = closestPart(element, PART.layout);

  return layout ? ownPart(layout, PART.layout, PART.floatOverlay) : undefined;
};

/** Where a lifted tabset opens: over its old spot, in the overlay's layout pixels, kept inside it. */
const measureFloatRect = (element: Element): Geometry => {
  const tabsetElement = closestPart(element, PART.tabset) ?? element;
  const overlay = ownFloatOverlay(element);
  const scale = overlay ? layoutScale(overlay) : { x: 1, y: 1 };

  const rect = toLayoutRect(
    tabsetElement.getBoundingClientRect(),
    overlay?.getBoundingClientRect(),
    scale,
  );

  const view = element.ownerDocument.defaultView;

  // An unstyled overlay has no box; the viewport is the best bound left.
  const bounds =
    overlay && overlay.clientWidth > 0
      ? { height: overlay.clientHeight, width: overlay.clientWidth }
      : view && { height: view.innerHeight, width: view.innerWidth };

  const seeded: Geometry = {
    height: Math.max(MIN_HEIGHT, Math.min(Math.round(rect.height), DEFAULT_FLOAT_GEOMETRY.height)),
    left: Math.round(rect.left) + LIFT_OFFSET,
    top: Math.round(rect.top) + LIFT_OFFSET,
    width: Math.max(MIN_WIDTH, Math.min(Math.round(rect.width), DEFAULT_FLOAT_GEOMETRY.width)),
  };

  return bounds ? clampToBounds(seeded, bounds) : seeded;
};

type ResizeEdges = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

/** `key` doubles as `data-edge`, which styles.css positions each handle by. */
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

const resizeRect = (start: Geometry, edges: ResizeEdges, dx: number, dy: number): Geometry => {
  let { height, left, top, width } = start;

  if (edges.x === 1) {
    width = Math.max(MIN_WIDTH, start.width + dx);
  } else if (edges.x === -1) {
    width = Math.max(MIN_WIDTH, start.width - dx);
    left = Math.max(0, start.left + (start.width - width));
  }

  if (edges.y === 1) {
    height = Math.max(MIN_HEIGHT, start.height + dy);
  } else if (edges.y === -1) {
    height = Math.max(MIN_HEIGHT, start.height - dy);
    top = Math.max(0, start.top + (start.height - height));
  }

  return { height, left, top, width };
};

/** The custom properties styles.css positions and sizes a float (or its chip) by. */
const floatGeometryStyle = (geometry: Geometry) => ({
  "--dashfoo-float-height": `${geometry.height}px`,
  "--dashfoo-float-left": `${geometry.left}px`,
  "--dashfoo-float-top": `${geometry.top}px`,
  "--dashfoo-float-width": `${geometry.width}px`,
});

export {
  clampToBounds,
  floatGeometryStyle,
  layoutScale,
  measureFloatRect,
  RESIZE_HANDLES,
  resizeRect,
  toLayoutRect,
};

export type { ResizeEdges, Scale, Size };

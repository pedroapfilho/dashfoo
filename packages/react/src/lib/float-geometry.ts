"use client";

import type { Geometry } from "@dashfoo/core";

// Pure rect math for floating panels, plus the one DOM measurement that seeds a
// float's initial position. A float's `geometry` is in CSS pixels relative to the
// layout container ([data-dashfoo="layout"]), so the overlay can position it with
// plain absolute left/top.

const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;
// A comfortable default window size. Floating a large docked panel opens at this
// size rather than the panel's full footprint; a smaller source keeps its size.
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 340;
// Nudge a freshly-floated panel down-right of where it was docked so it reads as
// lifted rather than pixel-aligned on top of its old slot.
const LIFT_OFFSET = 16;

type Size = { height: number; width: number };

const MIN_SIZE: Size = { height: MIN_HEIGHT, width: MIN_WIDTH };

// Keep a rect inside the container. A rect larger than the bounds pins to 0 on
// that axis rather than going negative.
const clampToBounds = (rect: Geometry, bounds: Size): Geometry => ({
  height: rect.height,
  left: Math.max(0, Math.min(rect.left, Math.max(0, bounds.width - rect.width))),
  top: Math.max(0, Math.min(rect.top, Math.max(0, bounds.height - rect.height))),
  width: rect.width,
});

// The initial rect for a float: a sane window size (the source panel's footprint,
// capped to the default so a large panel doesn't open huge), placed over where the
// panel was docked and lifted slightly, clamped to stay on screen.
const measureFloatRect = (element: Element): Geometry => {
  const tabsetElement = element.closest('[data-dashfoo="tabset"]') ?? element;
  const layoutElement = element.closest('[data-dashfoo="layout"]');
  const rect = tabsetElement.getBoundingClientRect();
  const origin = layoutElement?.getBoundingClientRect();
  const seeded: Geometry = {
    height: Math.max(MIN_HEIGHT, Math.min(Math.round(rect.height), DEFAULT_HEIGHT)),
    left: Math.round(rect.left - (origin?.left ?? 0)) + LIFT_OFFSET,
    top: Math.round(rect.top - (origin?.top ?? 0)) + LIFT_OFFSET,
    width: Math.max(MIN_WIDTH, Math.min(Math.round(rect.width), DEFAULT_WIDTH)),
  };
  return origin ? clampToBounds(seeded, origin) : seeded;
};

// Which edges a resize handle moves: -1 = the leading edge (left/top), 1 = the
// trailing edge (right/bottom), 0 = fixed on that axis.
type ResizeEdges = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

// Apply a pointer delta to a rect for one resize handle. A leading edge moves the
// origin and shrinks the size; the minimum size pins the moving edge.
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

export { clampToBounds, measureFloatRect, MIN_SIZE, resizeRect };
export type { ResizeEdges, Size };

"use client";

import type { Geometry } from "@dashfoo/core";

const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 340;

const LIFT_OFFSET = 16;

type Size = { height: number; width: number };

const clampToBounds = (rect: Geometry, bounds: Size, size: Size = rect): Geometry => ({
  height: rect.height,
  left: Math.max(0, Math.min(rect.left, Math.max(0, bounds.width - size.width))),
  top: Math.max(0, Math.min(rect.top, Math.max(0, bounds.height - size.height))),
  width: rect.width,
});

const measureFloatRect = (element: Element): Geometry => {
  const tabsetElement = element.closest('[data-dashfoo="tabset"]') ?? element;
  const rect = tabsetElement.getBoundingClientRect();
  const seeded: Geometry = {
    height: Math.max(MIN_HEIGHT, Math.min(Math.round(rect.height), DEFAULT_HEIGHT)),
    left: Math.round(rect.left) + LIFT_OFFSET,
    top: Math.round(rect.top) + LIFT_OFFSET,
    width: Math.max(MIN_WIDTH, Math.min(Math.round(rect.width), DEFAULT_WIDTH)),
  };
  return clampToBounds(seeded, { height: window.innerHeight, width: window.innerWidth });
};

type ResizeEdges = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

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

export { clampToBounds, measureFloatRect, resizeRect };
export type { ResizeEdges, Size };

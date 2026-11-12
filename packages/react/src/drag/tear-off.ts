import type { Dashfoo, Point } from "@dashfoo/core";

/** `point` is in screen pixels, ready for `window.open`'s `left` and `top`. */
type TearOffRequest = {
  kind: "tab" | "tabset";
  model: Dashfoo;
  nodeId: string;
  point: Point;
  size: { height: number; width: number };
};

/** Returning `true` removes the node from the layout with a `tearOff` action. */
type TearOffHandler = (request: TearOffRequest) => boolean;

const viewOf = (element: Element | null | undefined): Window | null =>
  element?.ownerDocument.defaultView ?? null;

/** `point` is in the client pixels of `view`, the window the drag started in. */
const isOutsideWindow = (point: Point, view: Window): boolean =>
  point.x < 0 || point.y < 0 || point.x >= view.innerWidth || point.y >= view.innerHeight;

/** Assumes the browser chrome sits above the viewport, which holds for every desktop browser. */
const toScreenPoint = (point: Point, view: Window): Point => ({
  x: Math.round(view.screenX + point.x),
  y: Math.round(view.screenY + (view.outerHeight - view.innerHeight) + point.y),
});

export { isOutsideWindow, toScreenPoint, viewOf };

export type { TearOffHandler, TearOffRequest };

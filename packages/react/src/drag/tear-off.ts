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

/** Where a drag let go, in screen pixels, and whether that is outside the window it started in. */
type Release = { outside: boolean; screen: Point };

const viewOf = (element: Element | null | undefined): Window | null =>
  element?.ownerDocument.defaultView ?? null;

/**
 * A pointer drag reports client pixels, so its bounds are the viewport. The
 * screen point assumes the browser chrome sits above the viewport, which holds
 * for every desktop browser.
 */
const pointerRelease = (point: Point, view: Window): Release => ({
  outside: point.x < 0 || point.y < 0 || point.x >= view.innerWidth || point.y >= view.innerHeight,
  screen: {
    x: Math.round(view.screenX + point.x),
    y: Math.round(view.screenY + (view.outerHeight - view.innerHeight) + point.y),
  },
});

/** A native drag ends with screen pixels, so its bounds are the whole window, browser chrome included. */
const nativeRelease = (event: Pick<MouseEvent, "screenX" | "screenY">, view: Window): Release => ({
  outside:
    event.screenX < view.screenX ||
    event.screenX >= view.screenX + view.outerWidth ||
    event.screenY < view.screenY ||
    event.screenY >= view.screenY + view.outerHeight,
  screen: { x: event.screenX, y: event.screenY },
});

export { nativeRelease, pointerRelease, viewOf };

export type { Release, TearOffHandler, TearOffRequest };

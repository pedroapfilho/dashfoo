import type { DockLocation, DropIntent, Point, Rect } from "@dashfoo/core";
import { resolveDockTarget } from "@dashfoo/core";

// Map a pointer hovering over a tabset's rect to a drop intent the dragDockMachine
// can commit: center stacks as a tab, an outer band splits in that direction.
const computeDropIntent = (targetId: string, rect: Rect, pointer: Point): DropIntent => {
  const target = resolveDockTarget(pointer, rect);
  const location: DockLocation = target.kind === "tab" ? "center" : `split-${target.edge}`;
  return { location, targetId };
};

// The region the dock indicator highlights for a given location over a tabset:
// the whole tabset for a center stack, the matching half for a split.
const zoneRect = (rect: Rect, location: DockLocation): Rect => {
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  switch (location) {
    case "split-bottom": {
      return { height: halfH, width: rect.width, x: rect.x, y: rect.y + halfH };
    }
    case "split-left": {
      return { height: rect.height, width: halfW, x: rect.x, y: rect.y };
    }
    case "split-right": {
      return { height: rect.height, width: halfW, x: rect.x + halfW, y: rect.y };
    }
    case "split-top": {
      return { height: halfH, width: rect.width, x: rect.x, y: rect.y };
    }
    default: {
      return rect;
    }
  }
};

export { computeDropIntent, zoneRect };

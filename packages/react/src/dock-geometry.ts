import type { BandOptions, DockLocation, DropIntent, Point, Rect } from "@dashfoo/core";
import { resolveBorderEdge, resolveDockTarget } from "@dashfoo/core";

// Thickness of the painted border-dock band, as a fraction of the frame.
const BORDER_BAND = 0.08;

// Map a pointer hovering over a tabset's rect to a drop intent the dragDockMachine
// can commit: center stacks as a tab, an outer band splits in that direction.
const computeDropIntent = (targetId: string, rect: Rect, pointer: Point): DropIntent => {
  const target = resolveDockTarget(pointer, rect);
  const location: DockLocation = target.kind === "tab" ? "center" : `split-${target.edge}`;
  return { location, targetId };
};

// A drop intent for docking a tab to the outer frame edge, or null when the
// pointer is in the interior. The reducer finds/creates the border by edge, so
// the target id is irrelevant here.
const frameEdgeIntent = (rect: Rect, pointer: Point, opts?: BandOptions): DropIntent | null => {
  const edge = resolveBorderEdge(pointer, rect, opts);
  return edge ? { location: `border-${edge}`, targetId: "" } : null;
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

// The strip the dock indicator paints along a frame edge for a border dock.
const borderZoneRect = (rect: Rect, location: DockLocation): Rect => {
  const w = rect.width * BORDER_BAND;
  const h = rect.height * BORDER_BAND;
  switch (location) {
    case "border-bottom": {
      return { height: h, width: rect.width, x: rect.x, y: rect.y + rect.height - h };
    }
    case "border-left": {
      return { height: rect.height, width: w, x: rect.x, y: rect.y };
    }
    case "border-right": {
      return { height: rect.height, width: w, x: rect.x + rect.width - w, y: rect.y };
    }
    case "border-top": {
      return { height: h, width: rect.width, x: rect.x, y: rect.y };
    }
    default: {
      return rect;
    }
  }
};

export { borderZoneRect, computeDropIntent, frameEdgeIntent, zoneRect };

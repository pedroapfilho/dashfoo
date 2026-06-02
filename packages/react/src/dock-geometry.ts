import type { DockLocation, DropIntent, Point, Rect } from "@dashfoo/core";
import { resolveDockTarget } from "@dashfoo/core";

// Map a pointer hovering over a tabset's rect to a drop intent the dragDockMachine
// can commit: center stacks as a tab, an outer band splits in that direction.
const computeDropIntent = (targetId: string, rect: Rect, pointer: Point): DropIntent => {
  const target = resolveDockTarget(pointer, rect);
  const location: DockLocation = target.kind === "tab" ? "center" : `split-${target.edge}`;
  return { location, targetId };
};

export { computeDropIntent };

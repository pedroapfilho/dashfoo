import type { Point, Rect } from "@dashfoo/core";

// Pure drag math for the tab strip — rects in, geometry out. The drag adapter
// gathers the rects from the DOM and feeds them here, so this stays unit-testable
// without a live drag.

type Zone = { height: number; width: number; x: number; y: number };

// Is the point inside the rect? (Rect is DOMRect-compatible: x/y/width/height.)
const pointInRect = (point: Point, rect: Rect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

// Which slot in the strip the pointer is over: the first tab whose midpoint is
// right of the pointer, else the end.
const insertionIndex = (rects: ReadonlyArray<Rect>, pointerX: number): number => {
  const found = rects.findIndex((rect) => pointerX < rect.x + rect.width / 2);
  return found === -1 ? rects.length : found;
};

// The thin vertical line marking where a tab will be inserted. Measured against
// whole tab-item rects (label + close), so the "after the last tab" position sits
// past the last close button rather than between the label and the close.
const insertionLineRect = (
  stripRect: Rect,
  itemRects: ReadonlyArray<Rect>,
  index: number,
): Zone => {
  const at = itemRects[index];
  const last = itemRects.at(-1);
  const x = at?.x ?? (last ? last.x + last.width : stripRect.x);
  return { height: stripRect.height, width: 2, x: x - 1, y: stripRect.y };
};

// Whether a drop should commit, or is a no-op to be suppressed: dragging a tabset
// onto itself (grip id is `grip-${tabsetId}`), or the sole tab of a tabset back
// onto that same tabset — both change nothing once empties collapse.
const shouldAllowDrop = (
  draggedId: string | undefined,
  targetId: string,
  tabIds: ReadonlyArray<string>,
): boolean => {
  if (draggedId === `grip-${targetId}`) {
    return false;
  }
  if (tabIds.length === 1 && tabIds[0] === draggedId) {
    return false;
  }
  return true;
};

export { insertionIndex, insertionLineRect, pointInRect, shouldAllowDrop };
export type { Zone };

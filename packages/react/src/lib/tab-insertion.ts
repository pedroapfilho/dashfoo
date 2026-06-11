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

// A tab-sized ghost marking where the dragged tab will land, mirroring the dock
// pane preview. Measured against whole tab-item rects (label + close), so the
// "after the last tab" position sits past the last close button rather than
// between the label and the close. The neighbors also anchor the ghost's y and
// height, so it sits exactly where a real tab does (tabs don't fill the strip);
// an empty strip falls back to the dragged tab's own height, bottom-aligned the
// way tabs rest on the strip's baseline. Clamped so the ghost never leaves the
// strip.
const insertionGhostRect = (
  stripRect: Rect,
  itemRects: ReadonlyArray<Rect>,
  index: number,
  tabSize: { height: number; width: number },
): Zone => {
  const at = itemRects[index];
  const last = itemRects.at(-1);
  const anchor = at ?? last;
  const x = at?.x ?? (last ? last.x + last.width : stripRect.x);
  const width = Math.min(tabSize.width, stripRect.width);
  const height = anchor?.height ?? Math.min(tabSize.height, stripRect.height);
  return {
    height,
    width,
    x: Math.max(stripRect.x, Math.min(x, stripRect.x + stripRect.width - width)),
    y: anchor?.y ?? stripRect.y + stripRect.height - height,
  };
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

export { insertionGhostRect, insertionIndex, pointInRect, shouldAllowDrop };
export type { Zone };

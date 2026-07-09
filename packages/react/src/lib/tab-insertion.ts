import type { Point, Rect } from "@dashfoo/core";

type Zone = { height: number; width: number; x: number; y: number };

const pointInRect = (point: Point, rect: Rect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

const insertionIndex = (rects: ReadonlyArray<Rect>, pointerX: number): number => {
  const found = rects.findIndex((rect) => pointerX < rect.x + rect.width / 2);
  return found === -1 ? rects.length : found;
};

const INSERTION_LINE_WIDTH = 4;

const insertionLineRect = (
  stripRect: Rect,
  itemRects: ReadonlyArray<Rect>,
  index: number,
): Zone => {
  const at = itemRects[index];
  const last = itemRects.at(-1);
  const x = at?.x ?? (last ? last.x + last.width : stripRect.x);
  const left = x - INSERTION_LINE_WIDTH / 2;
  return {
    height: stripRect.height,
    width: INSERTION_LINE_WIDTH,
    x: Math.max(stripRect.x, Math.min(left, stripRect.x + stripRect.width - INSERTION_LINE_WIDTH)),
    y: stripRect.y,
  };
};

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

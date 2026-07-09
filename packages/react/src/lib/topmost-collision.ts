import type { Collision, CollisionDetector, UniqueIdentifier } from "@dnd-kit/abstract";
import { CollisionPriority, CollisionType } from "@dnd-kit/abstract";

type TopmostDetectorInput = {
  dragOperation: { position: { current: { x: number; y: number } } };
  droppable: { element?: Element; id: UniqueIdentifier };
};

type TopmostDetector = (input: TopmostDetectorInput) => Collision | null;

const createTopmostPointerIntersection = (
  topElementAt: (x: number, y: number) => Element | null = (x, y) =>
    document.elementFromPoint(x, y),
): TopmostDetector => {
  let cached: { top: Element | null; x: number; y: number } | null = null;
  const topAt = (x: number, y: number): Element | null => {
    if (cached && cached.x === x && cached.y === y) {
      return cached.top;
    }
    const top = topElementAt(x, y);
    cached = { top, x, y };
    queueMicrotask(() => {
      cached = null;
    });
    return top;
  };

  return ({ dragOperation, droppable }) => {
    const { element } = droppable;
    if (!element) {
      return null;
    }
    const point = dragOperation.position.current;
    const top = topAt(point.x, point.y);
    if (!top || !element.contains(top)) {
      return null;
    }

    let depth = 0;
    for (let node: Element | null = element; node; node = node.parentElement) {
      depth += 1;
    }
    return {
      id: droppable.id,
      priority: CollisionPriority.High,
      type: CollisionType.PointerIntersection,
      value: depth,
    };
  };
};

const topmostPointerIntersection: CollisionDetector = createTopmostPointerIntersection();

export { createTopmostPointerIntersection, topmostPointerIntersection };
export type { TopmostDetectorInput };

import type { Collision, CollisionDetector, UniqueIdentifier } from "@dnd-kit/abstract";
import { CollisionPriority, CollisionType } from "@dnd-kit/abstract";

type TopmostDetectorInput = {
  dragOperation: { position: { current: { x: number; y: number } } };
  droppable: { element?: Element; id: UniqueIdentifier };
};

type TopmostDetector = (input: TopmostDetectorInput) => Collision | null;

/** The droppable's own document: a layout rendered into a popup hit-tests that window. */
const elementAtPoint = (droppable: Element, x: number, y: number): Element | null =>
  droppable.ownerDocument.elementFromPoint(x, y);

const createTopmostPointerIntersection = (
  topElementAt: (droppable: Element, x: number, y: number) => Element | null = elementAtPoint,
): TopmostDetector => {
  let cached: { document: Document; top: Element | null; x: number; y: number } | null = null;

  const topAt = (droppable: Element, x: number, y: number): Element | null => {
    if (cached?.x === x && cached.y === y && cached.document === droppable.ownerDocument) {
      return cached.top;
    }

    const top = topElementAt(droppable, x, y);
    cached = { document: droppable.ownerDocument, top, x, y };
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
    const top = topAt(element, point.x, point.y);

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

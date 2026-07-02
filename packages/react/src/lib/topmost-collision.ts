import type { Collision, CollisionDetector, UniqueIdentifier } from "@dnd-kit/abstract";
import { CollisionPriority, CollisionType } from "@dnd-kit/abstract";

// The collision detector behind every tabset droppable. dnd-kit's built-in
// detectors are pure rect geometry with no notion of paint order, but docked
// tabsets tile while floats overlay them — a tabset's rect can contain a point
// that is actually over a float on top of it. elementFromPoint returns the
// occluding element, so an occluded tabset's detector returns null and it never
// becomes the drop target or shows a stale indicator. The drag overlays
// (preview, indicator) are pointer-events:none, so they're ignored.
//
// Never reads droppable.shape: shapes ride a throttled PositionObserver, while
// the live DOM answer is always current (auto-scroll, float moves mid-drag).

// What the detector actually reads — a structural supertype of dnd-kit's
// CollisionDetectorInput, so the same function serves dnd-kit at runtime and
// plain objects in unit tests. The abstract Droppable carries no element; a
// droppable without one can't be hit.
type TopmostDetectorInput = {
  dragOperation: { position: { current: { x: number; y: number } } };
  droppable: { element?: Element; id: UniqueIdentifier };
};

type TopmostDetector = (input: TopmostDetectorInput) => Collision | null;

// One elementFromPoint per collision pass, not per droppable: a pass runs
// synchronously over every droppable at one pointer position, so the lookup is
// cached by exact coordinates and dropped on the next microtask — before any
// later pass (whose DOM may have scrolled under a stationary pointer) can read
// a stale answer.
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
    // At most one non-nested droppable contains the topmost element; when
    // droppables nest (a layout inside a tab), DOM depth makes the innermost
    // win deterministically.
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

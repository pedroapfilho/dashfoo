# ADR 0005 — Build on @dnd-kit 0.4 and react-resizable-panels v4, behind adapters

## Status

Accepted · 2026-06-02 · **Amended 2026-06** (see update below)

> **Update (2026-06).** The drag layer was re-architected off the `@dnd-kit/react`
> bindings onto the framework-agnostic **`@dnd-kit/dom` 0.4 core**, driven
> imperatively from the adapter. The adapter now renders its own drag-preview
> overlay and hit-tests the pointer against registered tabsets (no dnd-kit
> droppables/collision/Feedback plugin), which removed a class of React-reconciliation
> workarounds. The `KeyboardSensor` was also dropped, so drag is **pointer-only**.
> The decision below — pin the new dnd-kit line, isolate it behind one adapter
> file — stands; only the specific entry point changed (`@dnd-kit/react` →
> `@dnd-kit/dom`). The adapter-isolation thesis is exactly what made this swap a
> one-file change.

## Context

A docking layout needs two interactions that are hard to get right: dragging a
tab from one region to another, and resizing tiled regions by their shared
edge. Both have many failure modes: pointer capture, touch vs mouse,
keyboard operation, accessibility roles, RTL, nested scroll containers. Writing
either from scratch is a project on its own.

dashfoo's value is the engine: the zod schema, the pure reducer over
`structuredClone`, the XState machines, the geometry. Drag and resize are
primitives the engine sits on top of. We want proven primitives without letting
them leak into the rest of the library, so the engine stays testable in plain
TypeScript and the primitives stay swappable.

Two version choices are live:

- **@dnd-kit.** The widely-used `@dnd-kit/core` 6.x predates the rewrite. The
  new `@dnd-kit/react` 0.4 line exposes an `operation` model (source, target,
  live pointer position) that matches how a dock target is computed on every
  move, and it ships first-class React bindings rather than the older
  sensor/modifier wiring.
- **react-resizable-panels (rrp) v4.** v4 is the current major; its `Group` /
  `Panel` / `Separator` API takes percentage layouts and unit-typed
  min/max sizes, and emits a single `onLayoutChanged` on release rather than on
  every frame.

## Decision

**Build drag on `@dnd-kit/react` 0.4 and resize on `react-resizable-panels` v4.
Each primitive is confined to exactly one adapter module. Nothing else in the
library imports them.**

The two adapters:

| Concern        | Adapter module                        | Imports                  |
| -------------- | ------------------------------------- | ------------------------ |
| Drag / dock    | `packages/react/src/drag-adapter.tsx` | `@dnd-kit/react`         |
| Resize / split | `packages/react/src/row-view.tsx`     | `react-resizable-panels` |

`packages/react/package.json` pins them as ordinary dependencies:

```json
"@dnd-kit/collision": "0.4.0",
"@dnd-kit/helpers": "0.4.0",
"@dnd-kit/react": "0.4.0",
"react-resizable-panels": "^4.0.0"
```

### Why the new dnd-kit, and the operation/pointer model

`drag-adapter.tsx` is the only file that imports `@dnd-kit/react`. It does not
own drag logic. dnd-kit supplies source/target ids and the live pointer; the
already-unit-tested `dragDockMachine` from `@dashfoo/core` owns the lifecycle and
emits a `moveNode` commit.

The 0.4 `operation` model is what makes this clean. Every handler reads
`event.operation` for the current source, target, and pointer, then feeds the
machine:

```tsx
const handleDragMove = useCallback(
  (event: DragMoveEvent): void => {
    const op = event.operation;
    const target = op.target;
    const draggedId = op.source ? String(op.source.id) : undefined;
    const element = target ? tabsets.current.get(String(target.id)) : undefined;
    if (target && element) {
      const intent = resolveIntent(String(target.id), element, op.position.current, draggedId);
      actorRef.send({ intent, type: "OVER" });
    } else {
      actorRef.send({ intent: null, type: "OVER" });
    }
  },
  [actorRef, resolveIntent],
);
```

`op.position.current` is the authoritative pointer on `onDragMove` and again on
`onDragEnd`, so the drop zone is recomputed from the same source on release
(`handleDragEnd`), then intent and commit fire as one synchronous pair. The
machine's live `intent` drives the `data-dashfoo="dock-indicator"` overlay; the
adapter never decides where a tab lands, it only forwards positions in and paints
what the machine reports.

The hooks `useTabDraggable` and `useTabsetDroppable` wrap dnd-kit's
`useDraggable` / `useDroppable` and expose plain `{ isDragging, ref }` /
`{ isDropTarget, ref }`. Tab and tabset components touch those hooks, not dnd-kit.

### Why rrp v4, and separators carrying orientation

`row-view.tsx` is the only file that imports `react-resizable-panels`. It maps
the model to rrp and back:

- A `RowNode`'s `orientation` (`"row"` / `"column"`) maps to rrp's
  `Orientation` (`"horizontal"` / `"vertical"`).
- Responsive child weights become percentage `defaultSize` on each `Panel`.
- A tabset's unit-typed `min` / `max` (`Dimension`) becomes rrp size strings via
  `dimensionToSize` (`` `${dimension.value}${dimension.unit}` ``).
- rrp's `onLayoutChanged` (fired on release) commits one `adjustSplit` action
  back to the document with the new weights.

A `Separator` sits between adjacent panels:

```tsx
{
  index > 0 ? <Separator data-dashfoo="splitter" /> : null;
}
```

rrp's `Separator` renders the resize handle with the correct
`aria-orientation` for the group, so keyboard resize and assistive-tech reporting
come from the primitive rather than hand-rolled ARIA. The adapter tags it
`data-dashfoo="splitter"` and imposes no styling, consistent with the headless
posture.

## Consequences

- **Swappable primitives.** Replacing dnd-kit means rewriting one file
  (`drag-adapter.tsx`); replacing rrp means rewriting one file (`row-view.tsx`).
  The engine, schema, machines, and every other component are untouched because
  they never import either library.
- **The engine stays pure.** `dragDockMachine` and the reducer are tested in
  plain TypeScript with no DOM and no dnd-kit. The adapter is the seam where
  pointer events meet the machine.
- **Accessibility is delegated, not duplicated.** Keyboard resize and
  `aria-orientation` come from rrp's `Separator`; we do not re-implement them.
- **Version pins are explicit.** The dnd-kit packages are pinned to `0.4.0`
  exactly (the 0.4 line is pre-1.0 and can break between minors); rrp is `^4.0.0`.
  An import-boundary lint guard should keep both confined to their adapter so a
  stray import elsewhere fails CI rather than silently spreading the dependency.

## Alternatives considered

1. **`@dnd-kit/core` 6.x.** Rejected. The legacy sensor/modifier API does not
   expose the operation/pointer model the dock geometry wants, and it is the
   superseded line.
2. **Hand-rolled drag and resize.** Rejected. Pointer capture, touch, keyboard,
   and ARIA are exactly the parts that are expensive to build and easy to get
   wrong; that is not where dashfoo's value is.
3. **Let components import dnd-kit / rrp directly where convenient.** Rejected.
   It destroys the swap story and pulls DOM-bound dependencies into code that
   should stay primitive-agnostic. The single-adapter rule is the whole point.

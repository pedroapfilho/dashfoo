# Drag and dock

A tab drag in dashfoo has two possible outcomes, and which one fires depends
entirely on where the pointer is when you let go:

- **Over a tab strip.** The tab stacks into that tabset at a specific
  insertion index, with a thin insertion line showing the slot.
- **Over a tabset body.** The tab splits the tabset, creating a new region
  to the left, right, top, or bottom.

This guide explains how the pointer position resolves to one of those
outcomes, the pipeline that carries a drag from `useTabDraggable` to a
committed model change, and the gates that turn each outcome on or off.

The geometry lives in `@dashfoo/core` (`resolveDockTarget`) and `@dashfoo/react`
(the drag adapter). The drag adapter is the only module in the library that
touches `@dnd-kit` — and it drives the framework-agnostic `@dnd-kit/dom` core
imperatively (no React bindings). Everything it touches downstream is pure and
unit-tested.

> **Pointer-only.** Drag-docking uses a pointer sensor; there is no keyboard
> drag. The arrow keys are already bound to roving-tabindex tab navigation, and
> dnd-kit's keyboard nudge model conflicts with that, so keyboard docking would
> need its own interaction design. All other chrome (select, close, rename,
> maximize, overflow) stays fully keyboard-operable.

## The two landing zones

Every drop resolves to one `DockLocation`, the union the reducer understands:

```ts
type DockLocation = "center" | "split-left" | "split-right" | "split-top" | "split-bottom";
```

`center` stacks. `split-*` splits. The pointer's position inside a tabset's rect
picks which one.

### Over a tab strip: stack at an insertion index

When the pointer is inside the element marked `data-dashfoo="tabstrip"`, the
drop is always a stack. The adapter measures which slot the pointer is over by
walking the strip's `data-dashfoo="tab"` rects and finding the first tab whose
horizontal midpoint sits to the right of the pointer:

```ts
const insertionIndex = (strip, pointerX, excludeId) => {
  const rects = tabRects(strip, excludeId);
  const found = rects.findIndex((rect) => pointerX < rect.left + rect.width / 2);
  return found === -1 ? rects.length : found;
};
```

If the pointer is past every midpoint, the index is the end of the strip.

The dragged tab excludes **itself** from this measurement (`excludeId`). Its own
slot never counts toward the order, so the index is measured against the tabs it
will land among, not the ones currently rendered. This matters at commit time.
See [Why the index needs no adjustment](#why-the-index-needs-no-adjustment).

The resulting intent carries `location: "center"`, the target tabset id, and the
computed `index`:

```ts
{ index: insertionIndex(strip, point.x, draggedId), location: "center", targetId: id }
```

The on-screen feedback is a 2px vertical line (`insertionLineRect`) drawn at the
left edge of the tab currently sitting at that index, or at the right edge of
the last tab when inserting at the end.

### Over a tabset body: split in a direction

Below the strip, the tabset's own rect decides between stacking and splitting.
`resolveDockTarget` in `@dashfoo/core` measures the pointer's fractional distance
from each of the four edges. If the pointer is inside the central area, the drop
stacks; if it lands within the outer band (22% of the rect by default), it
splits toward the closest edge:

```ts
const resolveDockTarget = (pointer, rect, opts) => {
  const band = opts?.bandFraction ?? 0.22;
  const distances = edgeDistances(pointer, rect);
  const min = Math.min(distances.left, distances.right, distances.top, distances.bottom);
  if (min > band) {
    return { kind: "tab" };
  }
  return { edge: closestEdge(distances), kind: "split" };
};
```

In a corner, the nearer of the two edges wins. `computeDropIntent` maps the
result to a location: `kind: "tab"` becomes `"center"` (a stack at the end of the
tabset), and `kind: "split"` becomes `split-${edge}`.

A center drop over the **body** appends rather than inserting at a mid-strip
slot. The adapter sets `index` to the count of remaining tabs so the tab lands
last.

The indicator for a split highlights the matching half of the tabset:
`split-left` paints the left half, `split-top` the top half, and so on
(`zoneRect`).

## How resolution layers

For a pointer over a tabset, the adapter's `resolveIntent` runs the checks in a
fixed order:

1. **Tab strip.** Inside the strip, return a `center` stack at the insertion
   index.
2. **Tabset body.** Otherwise resolve `center` (append) or `split-*` from the
   tabset rect.

```ts
const resolveIntent = (targetId, element, point, draggedId) => {
  const intent = intentForTabset(targetId, element, point, draggedId);
  if (!splitDock && intent.location.startsWith("split-")) {
    return { location: "center", targetId };
  }
  return intent;
};
```

## The pipeline

A drag travels through five stages. The split is deliberate: the `@dnd-kit/dom`
pointer sensor owns input, `dragDockMachine` owns the interaction lifecycle and
never touches the document, and the reducer owns the model.

```
useTabDraggable  →  dnd-kit/dom  →  dragDockMachine  →  COMMIT  →  reducer
  (tab is         (pointer +       (OVER / DROP      (moveNode   (moveNode
   draggable)      hit-test)        lifecycle)        action)     applied)
```

### 1. `useTabDraggable` marks the tab

Each tab registers itself as a `@dnd-kit/dom` `Draggable`, created imperatively in
an effect and keyed by the tab id. The hook also carries the tab's name as the
drag-preview label:

```ts
const useTabDraggable = (tabId, disabled = false, label = "") => {
  // creates `new Draggable({ data: { label, type: "tab" }, id: tabId }, manager)`
  // in a useEffect, binds the element via a ref, and destroys it on cleanup.
  return { ref };
};
```

Tabsets register their DOM element with `useTabsetDroppable` so the adapter can
hit-test the pointer against each tabset's rect — there are no dnd-kit droppables
or collision detectors; targeting is our own point-in-rect test.

### 2. The adapter reads the pointer and hit-tests

`DragProvider` constructs one `@dnd-kit/dom` `DragDropManager` (minus the
`Feedback` and `Accessibility` plugins and the keyboard sensor) and subscribes to
its monitor for three events. On `dragstart` it sends `START` with the dragged
subject and shows its own `data-dashfoo="drag-preview"` chip. On `dragmove` it
reads the live pointer, finds the tabset under it, resolves an intent, and sends
`OVER` (positioning the preview chip imperatively, no re-render). On `dragend` it
re-resolves from the final pointer, sends a last `OVER`, then `DROP`.

The final recompute matters: the drop uses the authoritative final pointer, not
whatever the last `dragmove` happened to report, so the committed location matches
where the user actually released.

### 3. `dragDockMachine` runs the lifecycle

The XState machine has two states, `idle` and `dragging`. `START` stashes the
subject and enters `dragging`. Each `OVER` assigns the live intent (the indicator
reads it). `DROP` checks the `hasValidDrop` guard, which requires both a subject
and an intent to be present, and when valid emits a `COMMIT`:

```ts
emit(({ context }) => {
  const { intent, subject } = requireDrop(context);
  return {
    action: {
      index: intent.index,
      location: intent.location,
      sourceId: subject.id,
      targetId: intent.targetId,
      type: "moveNode",
    },
    type: "COMMIT",
  };
});
```

`CANCEL` (or a canceled drop) returns to `idle` and clears the context. The
machine never mutates the model; it only emits the action.

### 4. `COMMIT` forwards the action

`DragProvider` subscribes to the machine's `COMMIT` emission and forwards the
`moveNode` action to `onCommit`, which `DashfooLayout` wires straight to
`store.dispatch`.

### 5. The reducer applies `moveNode`

The reducer deep-copies the model (`structuredClone`, so the input is never
mutated), removes the source tab from wherever it lives, then re-inserts it at
the drop target. `center` stacks into the target tabset at `index`; `split-*`
creates a new tabset beside the target (reusing the parent row when the
orientation already matches, otherwise wrapping both in a new row). After the
action, self-healing invariants run (`normalize`) so the result is always a
valid, canonical model.

#### Why the index needs no adjustment

`moveNode` removes the source tab **before** inserting it:

```ts
const [removed] = source.container.children.splice(source.index, 1);
insertTab(draft, removed, { id: action.targetId, index: action.index, location: action.location });
```

Because the drag adapter already excluded the dragged tab when measuring the
insertion index, `action.index` indexes the post-removal array directly. No
off-by-one correction is needed when a tab moves within its own strip.

## Gates

Two flags decide what a drag can do. One is global; one is per tab.

| Gate              | Scope   | Where it lives           | Default | Effect when off                                        |
| ----------------- | ------- | ------------------------ | ------- | ------------------------------------------------------ |
| `enableSplitDock` | global  | `global.enableSplitDock` | on      | A drop over a tabset body stacks instead of splitting. |
| `enableDrag`      | per tab | `tab.enableDrag`         | on      | That tab can't be picked up at all.                    |

### Global gate

`DashfooLayout` reads the global flag and passes it to `DragProvider`. It
defaults to enabled. The check is `!== false`, so an absent flag means on:

```ts
const splitDock = store.model.global.enableSplitDock !== false;
```

When `enableSplitDock` is off, `resolveIntent` rewrites any `split-*` result back
to a `center` stack, so a drop over the body lands as a tab.

### Per-tab gate

A tab opts out of dragging by setting `enableDrag: false` in the model. The
tabset view passes that straight into `useTabDraggable` as its `disabled`
argument:

```ts
const { isDragging, ref } = useTabDraggable(tab.id, tab.enableDrag === false);
```

A disabled tab is rendered like any other but can't be picked up, so it can
never become the source of a `moveNode`.

## Styling the indicator

The drop indicator carries `data-dashfoo="dock-indicator"`. Following the
headless contract, the adapter sets only position and size inline; every visual
property is an overridable CSS custom property with a neutral fallback:

| Variable                      | Default                     | Applies to               |
| ----------------------------- | --------------------------- | ------------------------ |
| `--dashfoo-dock-fill`         | `rgba(125, 125, 135, 0.18)` | split band               |
| `--dashfoo-dock-border`       | `rgba(160, 160, 170, 0.75)` | split band               |
| `--dashfoo-dock-border-width` | `1px`                       | split band               |
| `--dashfoo-dock-radius`       | `6px`                       | split band               |
| `--dashfoo-dock-line`         | `rgb(140, 140, 150)`        | tab-strip insertion line |
| `--dashfoo-dock-line-radius`  | `2px`                       | tab-strip insertion line |

Override these on your theme's `[data-dashfoo="dock-indicator"]` rule to fully
own the look.

## See also

- `resolveDockTarget` in `@dashfoo/core` for the band math and `BandOptions`.
- `dock-geometry.ts` in `@dashfoo/react` for the indicator rects.
- `dragDockMachine` in `@dashfoo/core` for the interaction lifecycle.
- The `moveNode` and `insertTab` paths in the reducer for how a drop reshapes
  the model.

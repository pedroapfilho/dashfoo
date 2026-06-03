# Drag and dock

A tab drag in dashfoo has three possible outcomes, and which one fires depends
entirely on where the pointer is when you let go:

- **Over a tab strip.** The tab stacks into that tabset at a specific
  insertion index, with a thin insertion line showing the slot.
- **Over a tabset body.** The tab splits the tabset, creating a new region
  to the left, right, top, or bottom.
- **Into the outer frame gutter.** The tab docks as a border along that edge
  of the whole layout.

This guide explains how the pointer position resolves to one of those
outcomes, the pipeline that carries a drag from `useTabDraggable` to a
committed model change, and the gates that turn each outcome on or off.

The geometry lives in `@dashfoo/core` (`resolveDockTarget`, `resolveBorderEdge`)
and `@dashfoo/react` (`dock-geometry.ts`, the drag adapter). The drag adapter
is the only module in the library that imports `@dnd-kit/react`; everything it
touches downstream is pure and unit-tested.

## The three landing zones

Every drop resolves to one `DockLocation`, the union the reducer understands:

```ts
type DockLocation =
  | "center"
  | "split-left"
  | "split-right"
  | "split-top"
  | "split-bottom"
  | "border-left"
  | "border-right"
  | "border-top"
  | "border-bottom";
```

`center` stacks. `split-*` splits. `border-*` docks to the frame. The pointer's
position inside a tabset's rect, and the layout frame's rect, picks which one.

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

### Into the frame gutter: dock as a border

Border docking is checked first, against the whole layout, and it wins over the
tabset's own zones. `resolveBorderEdge` looks at the pointer's distance from the
edges of the `data-dashfoo="layout"` frame and returns an edge only when the
pointer is in the thin outer sliver (5% of the frame by default):

```ts
const resolveBorderEdge = (pointer, frame, opts) => {
  const band = opts?.bandFraction ?? 0.05;
  const distances = edgeDistances(pointer, frame);
  const min = Math.min(distances.left, distances.right, distances.top, distances.bottom);
  if (min < 0 || min > band) {
    return null;
  }
  return closestEdge(distances);
};
```

`null` means the pointer is in the interior, so border docking doesn't apply and
the tabset's own resolution runs. A non-null edge produces a `border-${edge}`
intent with an **empty** `targetId`. The reducer finds or creates the border by
its edge, so the id is irrelevant here.

The indicator paints a band along the chosen frame edge (`borderZoneRect`, 8% of
the frame thickness).

## How resolution layers

For a pointer over a tabset, the adapter's `resolveIntent` runs the checks in a
fixed order:

1. **Border first.** If border docking is enabled and the pointer is in the
   frame's outer sliver, return the `border-*` intent. The frame's edge beats
   the tabset's edge, so a tab near both the layout's left gutter and a tabset's
   left band docks to the border, not the split.
2. **Tab strip.** Inside the strip, return a `center` stack at the insertion
   index.
3. **Tabset body.** Otherwise resolve `center` (append) or `split-*` from the
   tabset rect.

```ts
const resolveIntent = (targetId, element, point, draggedId) => {
  const layout = element.closest('[data-dashfoo="layout"]');
  const border =
    borderDock && layout ? frameEdgeIntent(layout.getBoundingClientRect(), point) : null;
  if (border) {
    return border;
  }
  const intent = intentForTabset(targetId, element, point, draggedId);
  if (!splitDock && intent.location.startsWith("split-")) {
    return { location: "center", targetId };
  }
  return intent;
};
```

## The pipeline

A drag travels through five stages. The split is deliberate: `@dnd-kit/react`
owns pointer and keyboard input, `dragDockMachine` owns the interaction
lifecycle and never touches the document, and the reducer owns the model.

```
useTabDraggable  →  dnd-kit  →  dragDockMachine  →  COMMIT  →  reducer
  (tab is        (source id,   (OVER / DROP      (moveNode   (moveNode
   draggable)     pointer,      lifecycle)        action)     applied)
                  target id)
```

### 1. `useTabDraggable` marks the tab

Each tab registers itself as a draggable. The hook is a thin wrapper over
dnd-kit's `useDraggable`, keyed by the tab id:

```ts
const useTabDraggable = (tabId, disabled = false) => {
  const { isDragging, ref } = useDraggable({ data: { type: "tab" }, disabled, id: tabId });
  return { isDragging, ref };
};
```

Tabsets register the matching drop target with `useTabsetDroppable`, which also
caches the tabset's DOM element so the geometry helpers can read its rect.

### 2. dnd-kit reports source, target, and pointer

`DragProvider` wraps the tree in dnd-kit's `DragDropProvider` and handles three
events. On `onDragStart` it sends `START` with the dragged tab's id. On
`onDragMove` it reads the current target and pointer, resolves an intent, and
sends `OVER`. On `onDragEnd` it re-resolves from the authoritative final pointer,
sends a last `OVER`, then `DROP`.

The final recompute matters: the drop uses dnd-kit's final target and pointer,
not whatever the last `onDragMove` happened to report, so the committed location
matches where the user actually released.

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
orientation already matches, otherwise wrapping both in a new row); `border-*`
finds or creates the border for that edge. After the action, self-healing
invariants run (`normalize`) so the result is always a valid, canonical model.

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

Three flags decide what a drag can do. Two are global; one is per tab.

| Gate               | Scope   | Where it lives            | Default | Effect when off                                        |
| ------------------ | ------- | ------------------------- | ------- | ------------------------------------------------------ |
| `enableSplitDock`  | global  | `global.enableSplitDock`  | on      | A drop over a tabset body stacks instead of splitting. |
| `enableBorderDock` | global  | `global.enableBorderDock` | on      | The frame gutter no longer docks tabs as borders.      |
| `enableDrag`       | per tab | `tab.enableDrag`          | on      | That tab can't be picked up at all.                    |

### Global gates

`DashfooLayout` reads the global flags and passes them to `DragProvider`. Both
default to enabled. The check is `!== false`, so an absent flag means on:

```ts
const borderDock = store.model.global.enableBorderDock !== false;
const splitDock = store.model.global.enableSplitDock !== false;
```

When `enableSplitDock` is off, `resolveIntent` rewrites any `split-*` result back
to a `center` stack, so a drop over the body lands as a tab. When
`enableBorderDock` is off, the frame-edge check is skipped entirely and a drag
near the gutter falls through to the tabset's own zones.

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
| `--dashfoo-dock-fill`         | `rgba(125, 125, 135, 0.18)` | split / border band      |
| `--dashfoo-dock-border`       | `rgba(160, 160, 170, 0.75)` | split / border band      |
| `--dashfoo-dock-border-width` | `1px`                       | split / border band      |
| `--dashfoo-dock-radius`       | `6px`                       | split / border band      |
| `--dashfoo-dock-line`         | `rgb(140, 140, 150)`        | tab-strip insertion line |
| `--dashfoo-dock-line-radius`  | `2px`                       | tab-strip insertion line |

Override these on your theme's `[data-dashfoo="dock-indicator"]` rule to fully
own the look.

## See also

- `resolveDockTarget` and `resolveBorderEdge` in `@dashfoo/core` for the band
  math and `BandOptions`.
- `dock-geometry.ts` in `@dashfoo/react` for the indicator rects.
- `dragDockMachine` in `@dashfoo/core` for the interaction lifecycle.
- The `moveNode` and `insertTab` paths in the reducer for how a drop reshapes
  the model.

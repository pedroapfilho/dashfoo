# @dashfoo/core

The framework-free engine behind dashfoo's docking layout (FlexLayout / VS-Code-style
tiled, resizable, tabbed regions). Pure TypeScript: a zod schema for the model, a
pure reducer, self-healing invariants, drop geometry, an undo/redo history, JSON
serialization with validation, and the XState v5 drag/dock machine.

This package has **no React**. It depends only on `zod` and `xstate`. The React
bindings, the react-resizable-panels and @dnd-kit adapters, and all rendering live
in `@dashfoo/react`. You can drive this engine from any runtime (a worker, a test,
a non-React UI) by dispatching actions and reading back the next model.

## Install

```bash
pnpm add @dashfoo/core
```

## The model

A layout is one `Dashfoo` value. It is JSON-serializable by construction: per-tab
`config` is validated against a recursive JSON schema, so a function or symbol
slipped into `config` fails parsing instead of corrupting a saved layout.

```ts
type Dashfoo = {
  version: 1;
  global: GlobalAttributes;
  layout: RowNode; // the root is always a row
  activeTabsetId?: string;
  maximizedTabsetId?: string;
  floats: FloatNode[]; // floating panels, each its own layout subtree
};
```

The tree has three node kinds, each discriminated by `type`, plus an optional
floating-panel node:

| Node         | `type`     | Holds                                                                                    |
| ------------ | ---------- | ---------------------------------------------------------------------------------------- |
| `RowNode`    | `"row"`    | `children` (rows or tabsets), `orientation` (`row`/`column`), `weight?`                  |
| `TabsetNode` | `"tabset"` | `children` (tabs), `selected` index, optional `min`/`max`/`weight`                       |
| `TabNode`    | `"tab"`    | `component`, `name`, `id`, optional `config` + `enable*` flags                           |
| `FloatNode`  | `"float"`  | a floating panel: its own `layout` (`RowNode`), `geometry`, optional `name`, `minimized` |

Rows nest (a row's child can be another row), which is how arbitrary tiled splits
are represented. `floats` carry floating panels (see "Floating panels" below): each
owns a full `RowNode` layout, so traversals and actions treat a float as a second
root alongside `layout`. `min`/`max` are `Dimension` values (`{ unit, value }`) where
`unit` is one of `px`, `%`, `em`, `rem`, `vh`, `vw`. `global.tabSetMinSize` is
the default tabset minimum size in pixels for renderers that honor it; the React
adapter falls back to `320px` when it is omitted.

Every schema is exported as a zod object plus an inferred type, so untrusted input
can be validated before it reaches the reducer:

```ts
import { dashfooSchema, type Dashfoo } from "@dashfoo/core";

const model: Dashfoo = dashfooSchema.parse(untrustedJson);
```

### Builders

`model` / `row` / `tabset` / `tab` construct a valid model without the
`type`/`version`/`selected` boilerplate:

```ts
import { model, row, tabset, tab } from "@dashfoo/core";

const m = model(
  row([
    tabset([tab("chart", "Chart"), tab("depth", "Depth")], { id: "left", weight: 2 }),
    tabset([tab("book", "Order Book")], { id: "right" }),
  ]),
  { activeTabsetId: "left" },
);
```

A `tab`'s id defaults to its component name; `tabset`/`row` auto-generate an id
when omitted. Output is schema-valid by construction.

## The pure reducer

`reducer(model, action)` is the canonical engine. It deep-copies the model with
`structuredClone` (so the input is never mutated, no Immer), applies one action
to the copy, then runs `normalize` so the result is always valid and canonical.
When the normalized result equals the input structurally, it returns the input
object itself, so `Object.is(next, model)` means the action changed nothing.

```ts
const reducer: (model: Dashfoo, action: Action) => Dashfoo;
```

Every mutation is one immutable, discriminated `Action`. The reducer is exhaustive
over the union; an unhandled case throws at runtime via `assertNever`. Validate
untrusted payloads against `actionSchema` before dispatch.

| `action.type`            | Effect                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| `addNode`                | Insert a tab at a `DockLocation` (center / split-\*)               |
| `moveNode`               | Remove a tab by `sourceId`, re-insert it at a dock target          |
| `moveTabset`             | Remove a tabset by `sourceId`, re-dock it whole at a dock target   |
| `selectTab`              | Set a tabset's `selected` index                                    |
| `setActiveTabset`        | Mark the focused tabset                                            |
| `setMaximizedTabset`     | Maximize one tabset (or clear with `null`)                         |
| `setTabsetCollapsed`     | Collapse a `collapsible` tabset to its strip, or expand it         |
| `renameTab`              | Change a tab's `name`                                              |
| `deleteTab`              | Remove a tab                                                       |
| `deleteTabset`           | Remove a whole tabset                                              |
| `adjustSplit`            | Set the `weights` of a row's children (splitter drag)              |
| `floatTab`               | Float a tab out into a new floating panel                          |
| `floatTabset`            | Float a whole tabset (with its tabs) into a new floating panel     |
| `dockFloat`              | Dock a float back as its own panel (or `center`-merge its tabs)    |
| `moveFloat`              | Update a floating panel's stored rect (drag/resize)                |
| `setFloatMinimized`      | Collapse a float to a chip, or restore it                          |
| `renameFloat`            | Rename a floating panel's window title                             |
| `tearOff`                | Remove a tab or tabset released outside the window                 |
| `transferOut`            | Remove a tab or tabset dropped into another layout of a drag group |
| `transferIn`             | Insert a tab or tabset dragged in from another layout              |
| `updateNodeAttributes`   | Patch mutable attrs on a tab / tabset / row                        |
| `updateGlobalAttributes` | Patch the `global` block                                           |

The `DockLocation` union is `center` and
`split-top`/`split-bottom`/`split-left`/`split-right`. A `center` drop
stacks the tab into the target tabset. A `split-*` drop creates a new tabset beside
the target, reusing the parent row when its orientation already matches, otherwise
wrapping both in a fresh row.

The seven docking actions (`addNode`, `moveNode`, `moveTabset`, `floatTab`,
`floatTabset`, `dockFloat`, `transferIn`) share two rules. Each resolves its target before it
detaches anything, so a drop that cannot land changes nothing. And the tabset
that receives the moved content becomes `activeTabsetId`: the target on a
`center` drop, the newly placed tabset on a split, the floated tabset when
floating. `addNode` ignores a tab whose id is already in the layout and warns.
`floatTab` and `floatTabset` likewise reject a supplied `floatId` used by any
node or float, including their source. Rejection warns and leaves the model
and undo/redo history unchanged; omitting the ID generates a fresh one.
`transferIn` rejects a node whose tab ids are already in the layout, with a
warning, and gives a tabset whose id is taken a fresh one. While the main
layout is empty, `addNode`, `moveNode`, `moveTabset` and `transferIn` take its
row id as `targetId` and seed a tabset there.

`dockFloat` with a `targetId` needs a tabset in the main layout; any other id
is a no-op. Without one it targets the active main tabset, else the first main
tabset, and when the main layout has no tabsets the float's layout becomes the
main layout. A `moveNode` that splits a one-tab tabset off its own tab is a
no-op, and so is a `setMaximizedTabset` naming a tabset that lives in a float.

When a tab leaves its strip (closed, moved, floated), the selection stays on the
tab that was selected. If that tab is the one leaving, its right neighbour
inherits the selection, else its left one. With
`global.tabSetSelectOnRemove: "recent"` the tab selected before it inherits
instead, read from the tabset's `selectionHistory`, which `normalize` keeps.
`fallbackSelectedIndex(tabset, removedIndex, policy?)` returns the heir's index
in the strip as it stands, which is how a renderer previews a drag before the
drop.

A tabset with `collapsible: true` can be collapsed to its strip with
`setTabsetCollapsed`; `collapsed` is saved on the tabset and its `weight` stays
the share it expands back to. Selecting one of its tabs expands it. A row
always keeps one expanded child: `setTabsetCollapsed` refuses to collapse the
last one (`canCollapseTabset(parent, tabset)` answers the same question), and
`normalize` expands a row left with only collapsed children.

### Use the reducer directly

```ts
import { reducer, parseModel, type Action, type Dashfoo } from "@dashfoo/core";

const model: Dashfoo = parseModel({
  version: 1,
  global: {},
  layout: {
    type: "row",
    id: "root",
    orientation: "row",
    children: [
      {
        type: "tabset",
        id: "ts-1",
        selected: 0,
        children: [{ type: "tab", id: "tab-1", component: "editor", name: "README.md" }],
      },
    ],
  },
});

const stack: Action = {
  type: "addNode",
  targetId: "ts-1",
  location: "center",
  tab: { type: "tab", id: "tab-2", component: "editor", name: "index.ts" },
};

const next = reducer(model, stack);
// next.layout.children[0].children.length === 2; input `model` is untouched.
```

## normalize + invariants

`normalize(model)` is the self-healing pass run after every action. It keeps the
tree canonical so downstream code never has to defend against degenerate shapes:

- drops empty tabsets and empty rows
- simplifies a single-child row by lifting its lone child (which inherits the
  lifted row's weight, so sizing is preserved)
- absorbs a root that reduces to a single nested row
- clamps every tabset's `selected` into its strip
- preserves weights (`parseModel` and the builders supply the defaults)
- forces `activeTabsetId` / `maximizedTabsetId` to point at a tabset that exists
  (falling back to the first tabset, or clearing)
- heals each floating panel's own layout and drops a float once it empties

`normalize` is exported on its own if you build a model by hand and want it
canonicalized without dispatching an action.

## Tree helpers

Read-only lookups over a model, all exported:

```ts
collectRoots(model): Array<RowNode>;            // main layout + each float's layout
collectTabsets(model): Array<TabsetNode>;       // depth-first, across all roots
collectTabsetsInRow(row): Array<TabsetNode>;    // depth-first, within one row
getFirstTabset(model): TabsetNode | undefined;
findTabset(model, tabsetId): TabsetNode | undefined;
findTab(model, tabId): TabLocation | undefined; // searches tabsets
findFloat(model, floatId): FloatNode | undefined;
findRow(model, rowId): RowNode | undefined;
findAttributedNode(model, id): AttributedNode | undefined; // row, tabset, or tab
findTabsetParent(model, tabsetId): TabsetSlot | undefined;
findDuplicateIds(model): Array<string>;         // ids used more than once
standaloneModel(model, nodeId): Dashfoo | undefined; // just that tab (in its own tabset) or tabset
```

`findTab` returns `{ container, index, tab }` so a caller knows where the tab
lives (a tabset in some root). `findTabsetParent` returns a `TabsetSlot`,
`{ index, parent, tabset }`: the row holding the tabset, its index in that row,
and the tabset itself. Lookups span every root, so a floated tab is as
reachable as a docked one.

## Floating panels

A panel can float out into a movable, resizable overlay (the React layer renders
it in-app; see `@dashfoo/react`). Floats are first-class model nodes
(`Dashfoo.floats`), each owning a full `RowNode` layout, so they serialize and
self-heal like the main tree:

```ts
import { reducer } from "@dashfoo/core";

// Float the whole tabset "left" (the React layer supplies the in-app geometry;
// omit it for DEFAULT_FLOAT_GEOMETRY).
const floated = reducer(model, { type: "floatTabset", tabsetId: "left" });
floated.floats; // [{ type: "float", id, layout: RowNode, geometry }]

// Dock it back as its own panel and drop the float.
const docked = reducer(floated, { type: "dockFloat", floatId: floated.floats[0].id });
```

`normalize` runs over each float's layout too and drops a float once its last
panel leaves. The `floatNode(layout, geometry, opts?)` builder constructs one,
and `model(layout, { floats })` seeds them.

A float made without a `geometry` gets `DEFAULT_FLOAT_GEOMETRY`
(`{ left: 80, top: 80, width: 480, height: 360 }`). Every new float is named
from `DEFAULT_FLOAT_NAME` (`"Panel"`, then `"Panel 1"`, `"Panel 2"`, …, skipping
names other floats already use). `@dashfoo/react` reads both constants, so the
default title and size each have one definition.

## Geometry

Pure functions translate a pointer position into a drop intent and back into an
indicator rect. The @dnd-kit adapter in `@dashfoo/react` feeds them rects; you can
call them directly for custom drag logic.

```ts
resolveDockTarget(pointer, rect): DockLocation;
dockZonePolygons(rect): Array<DockZone>;
zoneRect(rect, location): Rect;
```

`resolveDockTarget` decides where a drag over a tabset should land: `"center"`
when the pointer is in the interior, or `split-${edge}` when it is within an
outer band of one of the four edges (a fixed 22%; the closer edge wins in
corners). `zoneRect` returns the
region the dock indicator highlights for a `DockLocation`: the whole tabset for a
`center` stack, the matching half for a split. `Point` and `Rect` are exported.

`dockZonePolygons` enumerates the full hit-region partition behind
`resolveDockTarget` as five polygons (`{ location, points }`): the inner center
rect and four edge trapezoids whose seams run from each rect corner to the
matching inner corner. The two functions share the band, so a map
painted from the polygons always agrees with the live hit-test; use it to
visualize drop zones or to build custom drop indicators.

## Drop intent

The whole rule for what a pointer over a tabset means, over a measured tabset
instead of the DOM. The React drag layer measures each tabset once per pointer
move and passes the same measurement to both functions, so the insertion index
and the insertion line always mark the same slot.

```ts
resolveDropIntent(subject, tabset, point, { splitDock, foreign }?): DropIntent | null;
dropIndicator(subject, tabset, intent): DropIndicator;
```

`subject` is a `DragSubject`: what is being dragged (see the drag machine
below). `tabset` is a `MeasuredTabset`:
`{ id, rect, strip }`, where `strip` is `{ rect, tabs }` with `tabs` in strip
order (`MeasuredTab`: `{ id, rect }`, each rect spanning the whole tab item), or
`null` for a tabset without a strip.

`resolveDropIntent` returns `null` for a drop that changes nothing: a tabset onto
itself, or the sole tab of a tabset back onto it. Over the strip it stacks at
the insertion index (the first tab whose midpoint is right of the pointer, the
dragged tab's own slot excluded). Over the body it defers to `resolveDockTarget`,
appending a `center` stack past the remaining tabs; `splitDock: false` turns
every body drop into that stack, and `foreign: true` (a subject from another
document) skips the self-drop check, since a shared id is not the same node. A stripless tabset has no tab order, so its
stack drops carry no index.

`dropIndicator` returns `{ kind: "insertion", rect }` (a 4px line at the slot,
clamped inside the strip) for a `center` intent onto a strip, and
`{ kind: "zone", rect }` (`zoneRect`) otherwise.

`@dashfoo/react` exports the DOM read behind its drag layer as `measureTabset`,
so a custom drop overlay can build the same `MeasuredTabset` and match the
library's indicator.

Exports: `resolveDropIntent`, `dropIndicator`; types `DragSubject`,
`DropIntent`, `MeasuredTabset`, `MeasuredStrip`, `MeasuredTab`,
`DropIntentOptions`, `DropIndicator`.

## Snapping

Pure math for magnetic split-resize snapping, over ordered percentage arrays so
it stays framework-free; the React adapter maps rrp's id-keyed layout to/from
these arrays and supplies the dragged boundary index.

```ts
// resolveSnapGrid(config, panelCount).targets contains positions inside 0..100
resolveSnapGrid(config: SnapConfig | null, panelCount: number): SnapGrid;
decideSnap(sizes: number[], boundaryIndex: number | null, grid: SnapGrid): SnapDecision;
settleSnap(sizes: number[], boundaryIndex: number | null, grid: SnapGrid): number[];
snapEnabled(grid: SnapGrid): boolean;
```

`resolveSnapGrid` builds the grid for a row from its config and panel count: the
union of the `step` grid (multiples of a fixed percent) and the `divisions` grid
(even splits: multiples of `100/d`, where `d` is the number or, for `"panels"`,
the panel count). `decideSnap` snaps the boundary between panel `boundaryIndex`
and the next onto the nearest target within `threshold` (default `4`), moving only
that pair so siblings keep their size. It returns `{ kind: "engage", sizes }` when
the boundary snaps, `{ kind: "clear" }` when no target is in reach (or the
correction would drive a panel negative), and `{ kind: "inactive" }` with no
dragged boundary or an empty grid. `settleSnap` returns the sizes to commit on
release: the snapped ones when the boundary engages, else the input.

`resolveSnapGrid` is the entry point: it resolves the targets once for a row and
carries the threshold alongside them, and every other function takes that
`SnapGrid`. `snapEnabled` is then just "does this grid have any target", which
is why a config with no reachable target (`{ step: 100 }`, or
`{ divisions: "panels" }` on a one-panel row) reports off rather than arming the
per-move snap path. `SnapConfig` is the
`{ step?, divisions?, threshold? }` shape carried by `global.snap` and
`RowNode.snap`.

## History (undo / redo)

A small `past` / `present` / `future` structure that wraps the reducer. `present`
is the live model. `createHistory` normalizes the model it receives, so a history
always holds a canonical document.

```ts
import {
  canRedoHistory,
  canUndoHistory,
  createHistory,
  dispatchToHistory,
  redoHistory,
  undoHistory,
} from "@dashfoo/core";

let history = createHistory(model);
history = dispatchToHistory(history, { type: "deleteTab", tabId: "tab-2" });

if (canUndoHistory(history)) history = undoHistory(history);
if (canRedoHistory(history)) history = redoHistory(history);
```

Every dispatched action is its own undo step; there is no coalescing. A splitter
drag still lands as one step because react-resizable-panels v4 commits a single
`adjustSplit` when the drag is released, not a per-frame stream. Any new dispatch
clears the redo `future`. History keeps the most recent `HISTORY_LIMIT` (100) steps; older snapshots are dropped.

## Serialize

```ts
toJSON(model): string;          // JSON.stringify
fromJSON(json): Dashfoo;        // parse → validate → normalize
parseModel(value): Dashfoo;     // same, from an already-parsed value
restoreModel(value, { mapTab? }): Dashfoo | null; // tolerant, for saved layouts
```

`fromJSON` and `parseModel` validate an untrusted value against `dashfooSchema`
and return a normalized model. They throw on an invalid value. The payload's
`version` field is pinned to `1` by the schema itself, so a payload written in
any other format fails validation; a future format change bumps the literal.

`restoreModel` is the tolerant counterpart for saved layouts: a value that is
not a model warns and returns `null` instead of throwing. Its `mapTab` option
receives every saved tab (floats included) and returns the app's current
version of it, or `null` to drop it. The selected tab stays selected when tabs
before it are dropped, and the result is tidied by `normalize` like any parsed
model (emptied tabsets and rows collapse, selections are clamped).

```ts
const restored = restoreModel(JSON.parse(saved), {
  mapTab: (tab) => (tab.component in components ? tab : null),
});
```

## XState machine

The drag/dock interaction is a real lifecycle, so it is an XState v5 machine.
`@dashfoo/react` wires it to React, but it is framework-free and usable on its
own. The document needs no machine: `@dashfoo/react` holds a `History` directly.

### dragDockMachine

The drag/dock interaction lifecycle (`idle` → `dragging` → `idle`), driven by
abstract events the dnd-kit adapter maps from pointer input. It owns
transient drag state only and never touches the document. On a valid `DROP` it
**emits** a `COMMIT` carrying a `moveNode` action (the drag subject is a tab), a
`moveTabset` action (the subject is a whole tabset, dragged by its grip), or an
`addNode` action (an `external` subject: content dragged in from outside the
layout, carrying the `TabNode` to insert), which the React layer dispatches to
the document store.

Internal subjects carry `{ kind: "tab" | "tabset", id, documentId }`, where
`documentId` identifies the owning document and `id` stays local to its model.
External subjects carry `{ kind: "external", id, tab }`. `COMMIT` and
`dropAction(drag)` return the action, target `scope`, and original `subject`, so
hosts can check ownership again before dispatching. The React adapter rejects
internal subjects from another document while allowing moves between its main
and float layers and imports from external factories.

| Event    | Payload                            |
| -------- | ---------------------------------- |
| `START`  | `{ subject }`                      |
| `OVER`   | `{ drop: DropResolution \| null }` |
| `DROP`   | (none)                             |
| `CANCEL` | (none)                             |

## Public exports

`schema`: `dashfooSchema`, `rowNodeSchema`, `tabsetNodeSchema`, `tabNodeSchema`,
`floatNodeSchema`, `geometrySchema`, `dimensionSchema`, `snapSchema`,
`unitSchema`, `orientationSchema`, `globalAttributesSchema`,
`jsonValueSchema`; constants `DEFAULT_WEIGHT` (`1`), `DEFAULT_FLOAT_NAME`
(`"Panel"`), `DEFAULT_FLOAT_GEOMETRY` (`{ height: 360, left: 80, top: 80, width: 480 }`);
types `Dashfoo`, `DashfooInput`, `RowNodeInput`, `RowNode`, `TabsetNode`, `TabNode`,
`FloatNode`, `Geometry`, `Dimension`, `SnapConfig`, `Unit`, `Orientation`,
`GlobalAttributes`, `Node`, `Json`.

`builders`: `model`, `row`, `tabset`, `tab`, `floatNode`; option types
`ModelOptions`, `RowOptions`, `TabsetOptions`, `TabOptions`, `FloatOptions`.

`ids`: `createNodeId`, `createTabId`.

`actions`: `actionSchema`, `mutableNodeAttrsSchema`; types `Action`,
`MutableNodeAttrs`.

`reducer`: `reducer`. `docking`: `fallbackSelectedIndex`. `invariants`: `normalize`.

`tree`: `collectRoots`, `collectTabsets`, `collectTabsetsInRow`, `getFirstTabset`,
`findTabset`, `findTab`, `findFloat`, `findRow`, `findAttributedNode`,
`findTabsetParent`, `findDuplicateIds`; `standaloneModel`;
types `AttributedNode`, `TabLocation`, `TabsetSlot`.

`dock`: `dockLocationSchema`; `resolveDockTarget`, `dockZonePolygons`,
`zoneRect`; `resolveDropIntent`, `dropIndicator`; `dragDockMachine`,
`dropAction`; types `DockLocation`, `DockZone`, `Point`, `Rect`,
`DragSubject`, `DropIntent`, `DropIntentOptions`, `DropIndicator`,
`MeasuredTabset`, `MeasuredStrip`, `MeasuredTab`, `DragState`,
`DropResolution`.

`snap`: `resolveSnapGrid`, `decideSnap`, `settleSnap`, `snapEnabled`;
types `SnapGrid`, `SnapDecision`.

`history`: `createHistory`, `dispatchToHistory`, `undoHistory`, `redoHistory`,
`canUndoHistory`, `canRedoHistory`, `HISTORY_LIMIT`; type `History`.

`serialize`: `toJSON`, `fromJSON`, `parseModel`, `restoreModel`; types `MapTab`, `RestoreOptions`.

`warn`: `warn`, `warnOnce`. Both prefix the message with `[dashfoo]` and write it
with `console.warn`; `@dashfoo/react` reports its degraded paths through them.

## License

MIT

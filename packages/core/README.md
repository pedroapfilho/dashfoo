# @dashfoo/core

The framework-free engine behind dashfoo's docking layout (FlexLayout / VS-Code-style
tiled, resizable, tabbed regions). Pure TypeScript: a zod schema for the model, a
pure reducer, self-healing invariants, drop geometry, an undo/redo history, JSON
serialization with validation, and two XState v5 machines.

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
  version: number;
  global: GlobalAttributes;
  layout: RowNode; // the root is always a row
  activeTabsetId?: string;
  maximizedTabsetId?: string;
  windows?: WindowNode[]; // detached windows, each its own layout subtree
};
```

The tree has three node kinds, each discriminated by `type`, plus an optional
detached-window node:

| Node         | `type`     | Holds                                                                        |
| ------------ | ---------- | ---------------------------------------------------------------------------- |
| `RowNode`    | `"row"`    | `children` (rows or tabsets), `orientation` (`row`/`column`), `weight?`      |
| `TabsetNode` | `"tabset"` | `children` (tabs), `selected` index, optional `min`/`max`/`weight`           |
| `TabNode`    | `"tab"`    | `component`, `name`, `id`, optional `config` + `enable*` flags               |
| `WindowNode` | `"window"` | a detached window: its own `layout` (`RowNode`), `geometry`, optional `name` |

Rows nest (a row's child can be another row), which is how arbitrary tiled splits
are represented. `windows` carry popped-out panels (see "Detached windows" below):
each owns a full `RowNode` layout, so traversals and actions treat a window as a
second root alongside `layout`. `min`/`max` are `Dimension` values (`{ unit, value }`) where
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

```ts
const reducer: (model: Dashfoo, action: Action) => Dashfoo;
```

Every mutation is one immutable, discriminated `Action`. The reducer is exhaustive
over the union; an unhandled case throws at runtime via `assertNever`. Validate
untrusted payloads against `actionSchema` before dispatch.

| `action.type`            | Effect                                                           |
| ------------------------ | ---------------------------------------------------------------- |
| `addNode`                | Insert a tab at a `DockLocation` (center / split-\*)             |
| `moveNode`               | Remove a tab by `sourceId`, re-insert it at a dock target        |
| `moveTabset`             | Remove a tabset by `sourceId`, re-dock it whole at a dock target |
| `selectTab`              | Set a tabset's `selected` index                                  |
| `setActiveTabset`        | Mark the focused tabset                                          |
| `setMaximizedTabset`     | Maximize one tabset (or clear with `null`)                       |
| `renameTab`              | Change a tab's `name`                                            |
| `deleteTab`              | Remove a tab                                                     |
| `deleteTabset`           | Remove a whole tabset                                            |
| `adjustSplit`            | Set the `weights` of a row's children (splitter drag)            |
| `detachTab`              | Pop a tab out into a new detached window                         |
| `detachTabset`           | Pop a whole tabset (with its tabs) into a new detached window    |
| `reattachWindow`         | Dock a detached window's panel back into the main layout         |
| `updateWindowGeometry`   | Update a detached window's stored on-screen rect                 |
| `updateNodeAttributes`   | Patch mutable attrs on a tab / tabset / row                      |
| `updateGlobalAttributes` | Patch the `global` block                                         |

The `DockLocation` union is `center` and
`split-top`/`split-bottom`/`split-left`/`split-right`. A `center` drop
stacks the tab into the target tabset. A `split-*` drop creates a new tabset beside
the target, reusing the parent row when its orientation already matches, otherwise
wrapping both in a fresh row.

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
- clamps every `selected` index into range
- forces `activeTabsetId` / `maximizedTabsetId` to point at a tabset that exists
  (falling back to the first tabset, or clearing)
- heals each detached window's own layout and drops a window once it empties

`normalize` is exported on its own if you build a model by hand and want it
canonicalized without dispatching an action.

## Tree helpers

Read-only lookups over a model, all exported:

```ts
collectRoots(model): Array<RowNode>;            // main layout + each window's layout
collectTabsets(model): Array<TabsetNode>;       // depth-first, across all roots
getFirstTabset(model): TabsetNode | undefined;
findTabset(model, tabsetId): TabsetNode | undefined;
findTab(model, tabId): TabLocation | undefined; // searches tabsets
findWindow(model, windowId): WindowNode | undefined;
findRow(row, rowId): RowNode | undefined;       // pass a root (model.layout or a window's layout)
findRootContaining(model, nodeId): RowNode | undefined; // which root holds a node
findAttributedNode(model, id): AttributedNode | undefined; // row, tabset, or tab
findTabsetParent(row, tabsetId): { index: number; parent: RowNode } | undefined;
findDuplicateIds(model): Array<string>;         // ids used more than once
```

`findTab` returns `{ container, index, tab }` so a caller knows where the tab
lives (a tabset in some root). Lookups span every root, so a popped-out tab is as
reachable as a docked one; `findRootContaining` tells you which root (main layout
or a window) a node lives in.

## Detached windows

A panel can pop out into a standalone window. Windows are first-class model nodes
(`Dashfoo.windows`), each owning a full `RowNode` layout, so they serialize and
self-heal like the main tree:

```ts
import { reducer } from "@dashfoo/core";

// Pop the whole tabset "left" into a new window (the React adapter supplies the
// on-screen geometry; omit it for a default rect).
const detached = reducer(model, { type: "detachTabset", tabsetId: "left" });
detached.windows; // [{ type: "window", id, layout: RowNode, geometry }]

// Dock it back into the active main tabset (center) and drop the window.
const docked = reducer(detached, { type: "reattachWindow", windowId: detached.windows![0].id });
```

`normalize` runs over each window's layout too and drops a window once its last
panel leaves. The `windowNode(layout, geometry, opts?)` builder constructs one,
and `model(layout, { windows })` seeds them.

## Geometry

Pure functions translate a pointer position into a drop intent and back into an
indicator rect. The @dnd-kit adapter in `@dashfoo/react` feeds them rects; you can
call them directly for custom drag logic.

```ts
resolveDockTarget(pointer, rect, opts?): DockTarget;
dockZonePolygons(rect, opts?): Array<DockZone>;
zoneRect(rect, location): Rect;
```

`resolveDockTarget` decides where a drag over a tabset should land: `{ kind: "tab" }`
when the pointer is in the interior, or `{ kind: "split", edge }` when it is within
an outer band of one of the four edges (default 22%; the closer edge wins in
corners). It accepts `{ bandFraction }` to tune the band. `zoneRect` returns the
region the dock indicator highlights for a `DockLocation`: the whole tabset for a
`center` stack, the matching half for a split. `Point` and `Rect` are exported.

`dockZonePolygons` enumerates the full hit-region partition behind
`resolveDockTarget` as five polygons (`{ location, points }`): the inner center
rect and four edge trapezoids whose seams run from each rect corner to the
matching inner corner. The two functions share the band default, so a map
painted from the polygons always agrees with the live hit-test — use it to
visualize drop zones or to build custom drop indicators.

## Snapping

Pure math for magnetic split-resize snapping, over ordered percentage arrays so
it stays framework-free; the React adapter maps rrp's id-keyed layout to/from
these arrays and supplies the dragged boundary index.

```ts
resolveSnapTargets(config: SnapConfig, panelCount: number): number[]; // grid positions inside 0..100
snapSizes(sizes: number[], boundaryIndex: number, config: SnapConfig): { sizes: number[]; snapped: boolean };
snapEnabled(config: SnapConfig | null): boolean;
```

`resolveSnapTargets` builds the grid for a row from its config and panel count: the
union of the `step` grid (multiples of a fixed percent) and the `divisions` grid
(even splits — multiples of `100/d`, where `d` is the number or, for `"panels"`,
the panel count). `snapSizes` snaps the boundary between panel `boundaryIndex` and
the next onto the nearest target within `threshold` (default `4`), moving only that
pair so siblings keep their size. It is a no-op when the grid is empty, the index
is out of range, or the correction would drive a panel negative. `snapEnabled`
reports whether a config produces any grid. `SnapConfig` is the
`{ step?, divisions?, threshold? }` shape carried by `global.snap` and
`RowNode.snap`.

## History (undo / redo)

A small `past` / `present` / `future` structure that wraps the reducer. `present`
is the live model.

```ts
import { createHistory, dispatch, undo, redo, canUndo, canRedo } from "@dashfoo/core";

let history = createHistory(model);
history = dispatch(history, { type: "deleteTab", tabId: "tab-2" });

if (canUndo(history)) history = undo(history);
if (canRedo(history)) history = redo(history);
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
```

`fromJSON` and `parseModel` validate an untrusted value against `dashfooSchema`
and return a normalized model. They throw on an invalid value. The payload's
`version` field is pinned to `1` by the schema itself, so a payload written in
any other format fails validation; a future format change bumps the literal.

## XState machines

Two XState v5 machines model the runtime. `@dashfoo/react` wires them to React, but
they are framework-free and usable on their own.

### dashfooMachine

The document actor. It owns the undo/redo `History` (whose `present` is the live
model) and processes mutations through the history helpers. There is no lifecycle,
the document is data, so it has a single `ready` state and handles four events:

| Event       | Payload      | Effect                         |
| ----------- | ------------ | ------------------------------ |
| `DISPATCH`  | `{ action }` | run the reducer via `dispatch` |
| `UNDO`      | —            | step back                      |
| `REDO`      | —            | step forward                   |
| `SET_MODEL` | `{ model }`  | replace with a fresh history   |

```ts
import { createActor } from "xstate";
import { dashfooMachine } from "@dashfoo/core";

const actor = createActor(dashfooMachine, { input: { model } }).start();
actor.send({ type: "DISPATCH", action: { type: "deleteTab", tabId: "tab-2" } });
const current = actor.getSnapshot().context.history.present;
```

### dragDockMachine

The drag/dock interaction lifecycle (`idle` → `dragging` → `idle`), driven by
abstract events the dnd-kit adapter maps from pointer and keyboard input. It owns
transient drag state only and never touches the document. On a valid `DROP` it
**emits** a `COMMIT` carrying a `moveNode` action (the drag subject is a tab), a
`moveTabset` action (the subject is a whole tabset, dragged by its grip), or an
`addNode` action (an `external` subject — content dragged in from outside the
layout, carrying the `TabNode` to insert), which the React layer forwards to
`dashfooMachine`.

| Event    | Payload              |
| -------- | -------------------- |
| `START`  | `{ subject }`        |
| `OVER`   | `{ intent \| null }` |
| `DROP`   | —                    |
| `CANCEL` | —                    |

## Public exports

`schema` — `dashfooSchema`, `rowNodeSchema`, `tabsetNodeSchema`, `tabNodeSchema`,
`windowNodeSchema`, `geometrySchema`, `dimensionSchema`, `snapSchema`, `edgeSchema`,
`unitSchema`, `orientationSchema`, `globalAttributesSchema`,
`jsonValueSchema`; types `Dashfoo`, `RowNode`, `TabsetNode`, `TabNode`,
`WindowNode`, `Geometry`, `Dimension`, `SnapConfig`, `Edge`, `Unit`, `Orientation`,
`GlobalAttributes`, `Node`, `Json`.

`builders` — `model`, `row`, `tabset`, `tab`, `windowNode`; option types
`ModelOptions`, `RowOptions`, `TabsetOptions`, `TabOptions`, `WindowOptions`.

`ids` — `createNodeId`, `createTabId`.

`actions` — `actionSchema`, `dockLocationSchema`, `mutableNodeAttrsSchema`; types
`Action`, `DockLocation`, `DropIntent`, `MutableNodeAttrs`.

`reducer` — `reducer`. `invariants` — `normalize`.

`tree` — `collectRoots`, `collectTabsets`, `getFirstTabset`, `findTabset`,
`findTab`, `findWindow`, `findRow`, `findRootContaining`, `findAttributedNode`,
`findTabsetParent`, `findDuplicateIds`;
types `AttributedNode`, `TabContainer`, `TabLocation`.

`geometry` — `resolveDockTarget`, `dockZonePolygons`, `zoneRect`; types
`DockTarget`, `DockZone`, `BandOptions`, `Point`, `Rect`.

`snap` — `resolveSnapTargets`, `snapSizes`, `snapEnabled`, `DEFAULT_SNAP_THRESHOLD`;
type `SnapResult`.

`history` — `createHistory`, `dispatch`, `undo`, `redo`, `canUndo`, `canRedo`;
type `History`.

`serialize` — `toJSON`, `fromJSON`, `parseModel`.

`stack` — `stackModel` (flatten any layout into one row or column of all its
tabsets, the building block for a narrow-screen breakpoint).

`machines` — `dashfooMachine`, `dragDockMachine`; types `DashfooContext`,
`DashfooEvent`, `DashfooInput`, `DragContext`, `DragEvent`, `DragSubject`,
`DragEmitted`.

## License

MIT

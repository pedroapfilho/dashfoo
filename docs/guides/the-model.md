# The layout model

Everything dashfoo knows about a layout lives in one serializable tree: the
`Dashfoo` object. It is plain JSON — no class instances, no functions, no DOM
references. The pure reducer in `@dashfoo/core` takes a `Dashfoo` plus an action
and returns a new `Dashfoo` (via `structuredClone`, never mutation), so the same
value round-trips through `JSON.stringify`, a database column, a postMessage, or
React state without losing anything.

This guide walks the shape of that tree, the four node types and their per-node
`enable*` flags, how `normalize()` keeps the tree canonical after every action,
and the serialization helpers (`toJSON` / `fromJSON` / `migrate`) that move a
model in and out of storage.

Every type and schema referenced here is exported from `@dashfoo/core` and
defined in `packages/core/src/schema.ts`.

## The root: `Dashfoo`

```ts
type Dashfoo = {
  activeTabsetId?: string;
  borders: BorderNode[];
  global: GlobalAttributes;
  layout: RowNode;
  maximizedTabsetId?: string;
  version: number;
};
```

| Field               | Type               | What it holds                                               |
| ------------------- | ------------------ | ----------------------------------------------------------- |
| `layout`            | `RowNode`          | The tiled center area. Always a row at the root.            |
| `borders`           | `BorderNode[]`     | Edge-docked panel strips (left / right / top / bottom).     |
| `global`            | `GlobalAttributes` | Defaults that apply tree-wide unless a node overrides them. |
| `version`           | `number`           | Schema version of this payload. The current version is `1`. |
| `activeTabsetId`    | `string?`          | Id of the tabset that currently has focus.                  |
| `maximizedTabsetId` | `string?`          | Id of the tabset rendered full-area, hiding its siblings.   |

`layout` is the part most people picture: a recursive grid of rows and tabsets.
`borders` is a separate, flat list because edge strips are not tiled into the
grid — they dock to a side of the whole layout. Both `activeTabsetId` and
`maximizedTabsetId` are id references, not nested objects, which is why
`normalize()` has to check that they still point at a tabset that exists.

## Node types

There are four node types, discriminated by their `type` field: `row`,
`tabset`, `tab`, and `border`. Tabs are the leaves. Tabsets hold tabs. Rows hold
tabsets and other rows. Borders hold tabs but live outside the row tree.

### `RowNode` — the recursive container

```ts
type RowNode = {
  children: Array<RowNode | TabsetNode>;
  id: string;
  orientation: "row" | "column";
  type: "row";
  weight?: number;
};
```

A row lays its children out along one axis. `orientation: "row"` arranges them
left-to-right; `orientation: "column"` arranges them top-to-bottom. Children are
either tabsets (leaves of the grid) or nested rows (which is how you get a column
inside a row, and the resizable splitters between them). `weight` is the child's
share of its parent's space relative to its siblings; the root row's own
`weight` is ignored.

### `TabsetNode` — a tabbed pane

```ts
type TabsetNode = {
  children: TabNode[];
  enableClose?: boolean;
  enableMaximize?: boolean;
  id: string;
  max?: Dimension;
  min?: Dimension;
  selected: number;
  type: "tabset";
  weight?: number;
};
```

A tabset is one pane with a tab strip. `children` is its tabs; `selected` is the
index of the visible one (zero-based). `weight` works as it does on rows. `min`
and `max` are optional `Dimension` constraints — see [Dimensions](#dimensions)
below. The two flags gate this tabset's chrome:

| Flag             | Effect when `false`                    |
| ---------------- | -------------------------------------- |
| `enableClose`    | The tabset cannot be closed as a unit. |
| `enableMaximize` | The tabset has no maximize affordance. |

Omitting a flag falls back to the matching `global` default rather than to a
hardcoded value.

### `TabNode` — a leaf

```ts
type TabNode = {
  component: string;
  config?: Json;
  enableClose?: boolean;
  enableDrag?: boolean;
  enableRename?: boolean;
  id: string;
  name: string;
  type: "tab";
};
```

A tab is one document. `component` is a string key your renderer maps to a React
component; dashfoo stores the key, never the component itself, which is what
keeps the model serializable. `name` is the label shown in the strip. `config` is arbitrary per-tab state, but
it is validated against a JSON schema (`jsonValueSchema`), so a function or a
`Symbol` in `config` fails parsing rather than silently breaking serialization.

The three per-tab flags:

| Flag           | Effect when `false`                          |
| -------------- | -------------------------------------------- |
| `enableClose`  | The tab shows no close button.               |
| `enableDrag`   | The tab cannot be dragged to another tabset. |
| `enableRename` | Double-clicking the tab will not rename it.  |

### `BorderNode` — an edge strip

```ts
type BorderNode = {
  children: TabNode[];
  edge: "top" | "bottom" | "left" | "right";
  selected: number;
  size?: Dimension;
  type: "border";
};
```

A border is a strip of tabs docked to one `edge` of the layout. Unlike a tabset,
a border has no `id` and no `weight` — it is addressed by its `edge`, and there
is at most one per edge. `size` is the drawer's extent (width for left/right,
height for top/bottom) when a tab is open.

`selected` carries one extra convention for borders. A tabset always shows
something, so its `selected` is a valid index. A border can be fully collapsed
with no panel open, and that state is `selected: -1`. The `bottom` console border
in the demo's `bordersModel` ships collapsed exactly this way.

### Dimensions

A tabset's `min` / `max` and a border's `size` are `Dimension` values, not raw
numbers:

```ts
type Dimension = {
  unit: "px" | "%" | "em" | "rem" | "vh" | "vw";
  value: number;
};
```

Carrying the unit alongside the value lets a constraint read `{ unit: "px", value: 320 }`
or `{ unit: "%", value: 30 }` without an out-of-band convention about what the
number means. (rrp's panel `min` / `max` honor `px` and `%`.)

## Global attributes

`global` holds defaults that a node inherits unless it sets its own value. Every
field is optional; an empty `global: {}` is valid and means "use the renderer's
built-in defaults."

```ts
type GlobalAttributes = {
  enableBorderDock?: boolean;
  enableSplitDock?: boolean;
  tabEnableClose?: boolean;
  tabEnableRename?: boolean;
  tabLocation?: "top" | "bottom";
  tabSetEnableMaximize?: boolean;
  tabSetEnableTabStrip?: boolean;
};
```

The `tabEnable*` and `tabSetEnable*` keys are the tree-wide fallbacks for the
per-node `enable*` flags above (set one to `false` to turn the feature off
everywhere). `tabLocation: "bottom"` moves the tab strip below the content;
`tabSetEnableTabStrip: false` hides the strip entirely (a pure resizable-pane
grid). `enableSplitDock` and `enableBorderDock` toggle whether drops can split a
tabset or dock to an edge at all.

## A real model

Here is the demo's trading layout (`apps/demo-vite/src/models.ts`), trimmed to
show structure. A wide chart tabset on the left, weighted `2`, sits beside a
right-hand column (a nested row with `orientation: "column"`) holding the order
book above positions, each weighted `1`.

```ts
import type { Dashfoo } from "@dashfoo/core";

const tradingModel: Dashfoo = {
  activeTabsetId: "ts-chart",
  borders: [],
  global: {},
  layout: {
    children: [
      {
        children: [
          { component: "chart", id: "chart", name: "Chart", type: "tab" },
          { component: "depth", id: "depth", name: "Depth", type: "tab" },
        ],
        id: "ts-chart",
        selected: 0,
        type: "tabset",
        weight: 2,
      },
      {
        children: [
          {
            children: [
              { component: "book", id: "book", name: "Order Book", type: "tab" },
              { component: "trades", id: "trades", name: "Trades", type: "tab" },
            ],
            id: "ts-book",
            selected: 0,
            type: "tabset",
            weight: 1,
          },
          {
            children: [
              { component: "positions", id: "positions", name: "Positions", type: "tab" },
              { component: "orders", id: "orders", name: "Orders", type: "tab" },
              { component: "balances", id: "balances", name: "Balances", type: "tab" },
            ],
            id: "ts-positions",
            selected: 0,
            type: "tabset",
            weight: 1,
          },
        ],
        id: "right",
        orientation: "column",
        type: "row",
        weight: 1,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
};
```

Notice what is absent. No `enable*` flags, because the defaults are fine. No
`size`/`min`/`max`, because `weight` handles the proportions. No `maximizedTabsetId`,
because nothing starts maximized. The model carries only what differs from the
defaults, and `normalize()` fills in the rest of the invariants.

## How `normalize()` self-heals

Run after every action (and on every parse), `normalize()` rewrites a model into
its canonical form. The reducer can therefore produce a slightly-off intermediate
tree — a tabset whose last tab just closed, a row left with one child — and trust
the normalize pass to clean it up. There is one definition of "valid layout," and
it lives in `packages/core/src/invariants.ts`.

The pass enforces five invariants.

**1. Clamp every `selected` into range.** A tabset's `selected` is forced into
`[0, children.length - 1]`. An out-of-range index (say the selected tab was the
one that got closed) snaps to the nearest valid tab instead of pointing at
nothing. Borders get the same clamp, except `selected: -1` is preserved as the
deliberate "collapsed" state.

**2. Drop empty tabsets.** A tabset whose `children` array is empty is removed
from its parent row. Closing the last tab in a pane removes the pane, rather than
leaving an empty frame behind.

**3. Drop empty rows.** A row whose children all vanished (recursively) is
removed too. Emptiness propagates upward.

**4. Collapse single-child rows.** A row left with exactly one child is redundant
— it adds a nesting level without splitting anything — so the lone child is
lifted into the grandparent's place. The child inherits the collapsed row's
`weight`, so the visible sizing is preserved across the collapse. At the root,
if the tree reduces to a single child that is itself a row, that row is absorbed:
its children and orientation replace the root's, avoiding redundant nesting.

**5. Repair the id references.** `activeTabsetId` is checked against the set of
tabset ids that actually exist after the structural rewrites. If it no longer
points at a real tabset, it falls back to the first tabset in the tree.
`maximizedTabsetId` gets the same existence check, but a stale value is cleared
to `undefined` rather than reassigned — you do not want to silently maximize a
different pane than the one the user chose.

Because normalize is idempotent, applying it twice gives the same result as
applying it once. That property is what lets the reducer call it unconditionally.

## Serialization: `toJSON`, `fromJSON`, `migrate`

The helpers in `packages/core/src/serialize.ts` move a model across a storage
boundary safely.

```ts
import { fromJSON, toJSON } from "@dashfoo/core";

const json = toJSON(model); // Dashfoo -> string
const restored = fromJSON(json); // string -> validated, normalized Dashfoo
```

`toJSON` is a thin `JSON.stringify`. The work is on the way back in. `fromJSON`
parses the string, runs `migrate`, validates against `dashfooSchema`, and
returns a normalized model — so anything you load from `localStorage`, a URL, or
a server is guaranteed to be a canonical `Dashfoo` or to throw. There is no path
where a half-valid tree reaches your renderer.

Under the hood `fromJSON` is `parseModel(JSON.parse(json))`, and `parseModel`
composes the three steps:

```ts
const parseModel = (value: unknown): Dashfoo => normalize(dashfooSchema.parse(migrate(value)));
```

`migrate` upgrades an older persisted payload to the current schema version
before validation. Today only version `1` exists, so it does one thing: backfill
a missing or older `version` field up to `CURRENT_VERSION`. The structure matters
more than the current behavior — each future schema bump adds one migration step
here, so `fromJSON` stays forward-compatible with payloads written by older
builds of your app. A value already at or above the current version passes
through untouched.

```ts
const CURRENT_VERSION = 1;

const migrate = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  if ("version" in value && typeof value.version === "number" && value.version >= CURRENT_VERSION) {
    return value;
  }
  return { ...value, version: CURRENT_VERSION };
};
```

Order is deliberate: migrate first (so the payload matches the current schema),
validate second (so a malformed payload is rejected with a zod error), normalize
last (so the result is canonical). Skip migrate and an old payload fails
validation on a field that changed. Skip normalize and you might hand your
renderer a tree with a stale `selected` index.

## See also

- `packages/core/src/schema.ts` — the zod schemas and exported types for every
  node and for `Dashfoo` itself.
- `packages/core/src/invariants.ts` — the full `normalize()` implementation.
- `packages/core/src/serialize.ts` — `toJSON`, `fromJSON`, `migrate`, `parseModel`,
  `CURRENT_VERSION`.
- `apps/demo-vite/src/models.ts` — the five demo models (`tradingModel`,
  `dockingModel`, `chromeModel`, `bordersModel`, `playgroundModel`) as real
  literals you can copy from.

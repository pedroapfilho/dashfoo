# @dashfoo/core

The framework-free engine behind dashfoo's docking layout (FlexLayout / VS-Code-style
tiled, resizable, tabbed regions). Pure TypeScript: a zod schema for the model, a
pure reducer, self-healing invariants, drop geometry, an undo/redo history, JSON
serialization with migration, and two XState v5 machines.

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
};
```

The tree has three node kinds, each discriminated by `type`:

| Node         | `type`     | Holds                                                                   |
| ------------ | ---------- | ----------------------------------------------------------------------- |
| `RowNode`    | `"row"`    | `children` (rows or tabsets), `orientation` (`row`/`column`), `weight?` |
| `TabsetNode` | `"tabset"` | `children` (tabs), `selected` index, optional `min`/`max`/`weight`      |
| `TabNode`    | `"tab"`    | `component`, `name`, `id`, optional `config` + `enable*` flags          |

Rows nest (a row's child can be another row), which is how arbitrary tiled splits
are represented. `min`/`max` are `Dimension` values (`{ unit, value }`) where
`unit` is one of `px`, `%`, `em`, `rem`, `vh`, `vw`.

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

| `action.type`            | Effect                                                    |
| ------------------------ | --------------------------------------------------------- |
| `addNode`                | Insert a tab at a `DockLocation` (center / split-\*)      |
| `moveNode`               | Remove a tab by `sourceId`, re-insert it at a dock target |
| `selectTab`              | Set a tabset's `selected` index                           |
| `setActiveTabset`        | Mark the focused tabset                                   |
| `setMaximizedTabset`     | Maximize one tabset (or clear with `null`)                |
| `renameTab`              | Change a tab's `name`                                     |
| `deleteTab`              | Remove a tab                                              |
| `deleteTabset`           | Remove a whole tabset                                     |
| `adjustSplit`            | Set the `weights` of a row's children (splitter drag)     |
| `updateNodeAttributes`   | Patch mutable attrs on a tab / tabset / row               |
| `updateGlobalAttributes` | Patch the `global` block                                  |

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
- collapses a single-child row by lifting its lone child (which inherits the
  collapsed row's weight, so sizing is preserved)
- absorbs a root that reduces to a single nested row
- clamps every `selected` index into range
- forces `activeTabsetId` / `maximizedTabsetId` to point at a tabset that exists
  (falling back to the first tabset, or clearing)

`normalize` is exported on its own if you build a model by hand and want it
canonicalized without dispatching an action.

## Tree helpers

Read-only lookups over a model, all exported:

```ts
collectTabsets(model): Array<TabsetNode>;       // depth-first, layout only
getFirstTabset(model): TabsetNode | undefined;
findTabset(model, tabsetId): TabsetNode | undefined;
findTab(model, tabId): TabLocation | undefined; // searches tabsets
```

`findTab` returns `{ container, index, tab }` so a caller knows where the tab
lives (a tabset in the layout).

## Geometry

A pure function translates a pointer position into a drop intent. The
@dnd-kit adapter in `@dashfoo/react` feeds it rects; you can call it directly
for custom drag logic.

```ts
resolveDockTarget(pointer, rect, opts?): DockTarget;
```

`resolveDockTarget` decides where a drag over a tabset should land: `{ kind: "tab" }`
when the pointer is in the interior, or `{ kind: "split", edge }` when it is within
an outer band of one of the four edges (default 22%; the closer edge wins in
corners). It accepts `{ bandFraction }` to tune the band. `Point` and
`Rect` are exported.

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

`dispatch` coalesces resize actions. A continuous `adjustSplit`
drag emits many actions per frame but collapses into a single undo step, keyed by
the node being resized (so dragging a different splitter starts a new step). Any
new dispatch clears the redo `future`.

## Serialize + migrate

```ts
toJSON(model): string;          // JSON.stringify
fromJSON(json): Dashfoo;        // parse → migrate → validate → normalize
parseModel(value): Dashfoo;     // same, from an already-parsed value
migrate(value): unknown;        // upgrade an older payload to CURRENT_VERSION
CURRENT_VERSION: number;        // 1
```

`fromJSON` and `parseModel` run an untrusted value through `migrate`, validate it
against `dashfooSchema`, and return a normalized model. They throw on an invalid
value. `migrate` is the forward-compat seam. Today it only backfills a missing
`version`; future schema bumps add one step per version here.

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
**emits** a `COMMIT` carrying a `moveNode` action, which the React layer forwards
to `dashfooMachine`.

| Event    | Payload              |
| -------- | -------------------- |
| `START`  | `{ subject }`        |
| `OVER`   | `{ intent \| null }` |
| `DROP`   | —                    |
| `CANCEL` | —                    |

## Public exports

`schema` — `dashfooSchema`, `rowNodeSchema`, `tabsetNodeSchema`, `tabNodeSchema`,
`dimensionSchema`, `edgeSchema`, `unitSchema`,
`orientationSchema`, `globalAttributesSchema`,
`jsonValueSchema`; types `Dashfoo`, `RowNode`, `TabsetNode`, `TabNode`,
`Dimension`, `Edge`, `Unit`, `Orientation`,
`GlobalAttributes`, `Node`, `Json`.

`builders` — `model`, `row`, `tabset`, `tab`; option types `ModelOptions`,
`RowOptions`, `TabsetOptions`, `TabOptions`.

`ids` — `createNodeId`, `createTabId`.

`actions` — `actionSchema`, `dockLocationSchema`, `mutableNodeAttrsSchema`; types
`Action`, `DockLocation`, `MutableNodeAttrs`.

`reducer` — `reducer`. `invariants` — `normalize`.

`tree` — `collectTabsets`, `getFirstTabset`, `findTabset`, `findTab`;
types `TabContainer`, `TabLocation`.

`geometry` — `resolveDockTarget`; types `DockTarget`,
`BandOptions`, `Point`, `Rect`.

`history` — `createHistory`, `dispatch`, `undo`, `redo`, `canUndo`, `canRedo`;
type `History`.

`serialize` — `toJSON`, `fromJSON`, `parseModel`, `migrate`, `CURRENT_VERSION`.

`machines` — `dashfooMachine`, `dragDockMachine`; types `DashfooContext`,
`DashfooEvent`, `DashfooInput`, `DragContext`, `DragEvent`, `DragSubject`,
`DropIntent`, `DragEmitted`.

## License

MIT

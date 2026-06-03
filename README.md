<div align="center">

# dashfoo

**A headless React docking-layout library — tiled, resizable, tabbed regions with a serializable model and zero imposed styling.**

</div>

dashfoo builds VS-Code-style dashboards in React: nested rows and columns of resizable panes, each pane a tabset you can restack, split, reorder, rename, close, and maximize by dragging. The layout is a single serializable model — a plain object validated by zod — that is the one source of truth. The engine ships structure, not appearance: `@dashfoo/react` renders markup tagged with `data-dashfoo="..."` attributes and applies no CSS, so the chrome is yours to style.

It exists to deliver FlexLayout's power without FlexLayout's central weakness, chrome you cannot restructure. State lives in one XState actor system, document mutations run through a pure reducer, and the drag/resize primitives sit behind adapters you never touch.

**At a glance**

- **What it is.** A headless docking-layout engine for React: split/tab tree, drag-docking, resizable splitters, border drawers, maximize, undo/redo.
- **What it gives you.** A serializable zod-validated model, a typed `<DashfooLayout>` component, controlled or uncontrolled state, and a `data-dashfoo` markup contract you style however you want.
- **Who it's for.** Apps that need real docking — trading terminals, IDEs, dashboards, monitoring consoles — and teams who want to own the look instead of fighting a prebuilt skin.
- **Built on.** `react-resizable-panels` (resize), `@dnd-kit/react` `0.4.0` (drag), XState v5 (state), zod (schema). All bundled, none exposed.

## Quickstart

```bash
pnpm add @dashfoo/core @dashfoo/react
```

Describe the layout as a model, then mount `<DashfooLayout>`. Tab content is never stored in the model — each `tab` carries a `component` key that you resolve to a React element, either through a `components` registry or a `factory` callback.

```tsx
// src/dashboard.tsx
import type { Dashfoo, TabNode } from "@dashfoo/core";
import { DashfooLayout } from "@dashfoo/react";

const tab = (id: string, name: string): TabNode => ({ component: id, id, name, type: "tab" });

const model: Dashfoo = {
  borders: [],
  global: {},
  version: 1,
  layout: {
    id: "root",
    type: "row",
    orientation: "row",
    children: [
      {
        id: "left",
        type: "tabset",
        selected: 0,
        weight: 2,
        children: [tab("chart", "Chart"), tab("depth", "Depth")],
      },
      {
        id: "right",
        type: "tabset",
        selected: 0,
        weight: 1,
        children: [tab("book", "Order Book"), tab("trades", "Trades")],
      },
    ],
  },
};

const ChartPanel = ({ node }: { node: TabNode }) => <div>{node.name} content</div>;

export const Dashboard = () => (
  <DashfooLayout
    defaultModel={model}
    components={{
      chart: ChartPanel,
      depth: ChartPanel,
      book: ChartPanel,
      trades: ChartPanel,
    }}
  />
);
```

A `components` registry maps each `tab.component` key to a `ComponentType<{ node: TabNode }>`. Prefer a single function? Pass `factory` instead and switch on the tab yourself:

```tsx
import type { TabNode } from "@dashfoo/core";
import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";

const renderPanel = (tab: TabNode): ReactNode => {
  switch (tab.component) {
    case "chart":
      return <ChartPanel node={tab} />;
    default:
      return <div>{tab.name}</div>;
  }
};

<DashfooLayout defaultModel={model} factory={renderPanel} />;
```

That is the whole surface for a working dashboard: a model and a way to resolve tab content. Drag, resize, rename, close, and maximize come for free.

## Highlights

- **Model is the source of truth.** The layout is a plain, JSON-serializable object validated by `dashfooSchema`. `toJSON` / `fromJSON` round-trip it losslessly because content never lives in the model, only a `component` registry key.
- **Headless by design.** `@dashfoo/react` renders markup with `data-dashfoo="..."` attributes and applies zero styling. Target those attributes with your own CSS, or drop in `@dashfoo/theme` later.
- **Controlled or uncontrolled.** Pass `defaultModel` and let the engine own state with built-in undo/redo, or pass `model` + `onModelChange` and own persistence yourself (backend, URL). Same model shape either way.
- **Pure reducer, self-healing tree.** Every change is one immutable `Action` run through `reducer(model, action)`. Invariants normalize after each action: empty tabsets are removed, single-child rows collapse, `selected` indices clamp, `maximizedTabsetId` clears when its tabset disappears.
- **Primitives stay internal.** `react-resizable-panels`, `@dnd-kit/react`, and XState are bundled dependencies behind adapters, not peers. React and react-dom are the only true peer dependencies. A primitive version bump touches one adapter file, not your code.
- **Type-safe end to end.** All model and action types are derived from zod schemas via `z.infer`, so the schema and the types never drift.

## When to use dashfoo

| Reach for dashfoo when…                                                      | Reach for something else when…                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| You need real docking — drag tabs to stack, split, or dock to an edge.       | You need a free 2D grid with absolute x/y/w/h (use react-grid-layout/gridstack).  |
| You want to own every pixel of the chrome and style raw markup yourself.     | You want a turnkey, fully-styled panel UI out of the box right now.               |
| You want the layout as a serializable model you can save, diff, and restore. | A simple two-pane resizable split is all you need (use react-resizable-panels).   |
| You want undo/redo and self-healing tree invariants for free.                | You need panels that detach into native browser windows or float over the layout. |

dashfoo is a split/tab tree, not a coordinate canvas. Popout to native windows, in-document floating panels, and nested sub-layouts are deliberately out of v1.

## Packages

Three published packages, plus the demo apps that exercise them.

| Package          | Purpose                                                                                                                                                                                                                                             | Install                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `@dashfoo/core`  | Pure TS engine. zod schema + derived types, the pure `reducer`, tree invariants, `resolveDockTarget` geometry, undo/redo history, `toJSON`/`fromJSON` + migrations, and the XState machines. No React.                                              | `pnpm add @dashfoo/core`  |
| `@dashfoo/react` | The React layer. `DashfooLayout`, the store binding (controlled/uncontrolled + undo/redo), `usePersistedModel` persistence, and the `react-resizable-panels` + `@dnd-kit/react` adapters. Renders headless `data-dashfoo` markup with zero styling. | `pnpm add @dashfoo/react` |
| `@dashfoo/theme` | Opt-in styled skin composed from the headless components: Base UI + Tailwind v4 + a published `tokens.css`. Phase 7, placeholder today.                                                                                                             | `pnpm add @dashfoo/theme` |

`@dashfoo/react` declares `react` and `react-dom` (`^18.3.1 || ^19.0.0`) as its only peers. Everything else — `@dashfoo/core`, `xstate`, `@xstate/react`, `react-resizable-panels`, `@dnd-kit/*` — is a bundled dependency, so install is one line and the primitives never leak into your dependency tree.

## Architecture

### Model as the source of truth

A `Dashfoo` model is a plain object: a `version`, a `global` attributes bag, a root `layout` row, and zero-to-four `borders`. The tree nests three node kinds.

```ts
type Dashfoo = {
  version: number;
  global: GlobalAttributes;
  layout: RowNode; // root is always a row
  borders: BorderNode[]; // 0–4, one per edge
  activeTabsetId?: string;
  maximizedTabsetId?: string;
};
```

| Node         | Shape                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RowNode`    | `{ type: "row"; id; orientation: "row" \| "column"; weight?; children: (RowNode \| TabsetNode)[] }` — orientation is explicit, never inferred from depth. |
| `TabsetNode` | `{ type: "tabset"; id; selected: number; weight?; size?; min?; max?; children: TabNode[] }` — a pane holding ordered tabs.                                |
| `TabNode`    | `{ type: "tab"; id; component: string; name: string; config?: Json; icon? }` — `component` is a registry key; content is resolved at render.              |

Sizing is responsive by default: `weight` is a proportional share within a row, so resized layouts stay fluid as the container changes. `Dimension` (`{ value, unit }`, with units `px` / `%` / `em` / `rem` / `vh` / `vw`) is reserved for `min` / `max` constraints, border sizes, and intentionally fixed panes.

### The core engine

`@dashfoo/core` is pure TypeScript with no React. Every document change is one immutable `Action` from a discriminated union — `addNode`, `moveNode`, `deleteTab`, `deleteTabset`, `renameTab`, `selectTab`, `setActiveTabset`, `adjustSplit`, `adjustBorderSize`, `setBorderSelected`, `setMaximizedTabset`, `updateNodeAttributes`, `updateGlobalAttributes`. The engine is a pure function:

```ts
import { reducer, normalize, toJSON, fromJSON } from "@dashfoo/core";

const next = reducer(model, { type: "renameTab", tabId: "chart", name: "Price" });
```

The reducer is pure and immutable, runs the self-healing invariants (`normalize`) after every action, and validates action payloads against `actionSchema` at the boundary. `resolveDockTarget` is a pure geometry function: outer bands of a tabset resolve to a split, the center to a tab stack, the frame's outer band to a border dock. Undo/redo is a pure helper over `past · present · future`, with resize drags coalesced into a single step. Serialization is `toJSON` / `fromJSON`, the latter validating and migrating an untrusted payload to the current schema version.

### The react adapters

`@dashfoo/react` binds a `dashfooMachine` actor to React. The two primitives are isolated behind adapters so the engine never imports them directly:

- The **resize adapter** wraps `react-resizable-panels`, mapping `weight` to percentage layout and `Dimension` to fixed/min/max panel sizes, and commits `adjustSplit` / `adjustBorderSize`.
- The **drag adapter** wraps `@dnd-kit/react` `0.4.0`, forwarding the drag lifecycle into the dock machine via a per-droppable collision detector built on `resolveDockTarget`, and commits `moveNode` / `addNode`.

XState is internal — it never appears in the public API. `useDashfooStore` exposes `{ model, dispatch, undo, redo, canUndo, canRedo }`; in controlled mode every change routes through `onModelChange`, in uncontrolled mode the actor owns the document with full undo/redo. `usePersistedModel` debounce-saves the model to a swappable `StorageAdapter` (localStorage, sessionStorage, in-memory, or your own), validating and migrating on load.

### The headless data-dashfoo contract

`@dashfoo/react` renders structure and applies no styling. Every chrome element carries a stable `data-dashfoo` attribute you target from CSS:

| Attribute value    | Element                                  |
| ------------------ | ---------------------------------------- |
| `layout`           | Root layout container                    |
| `frame`            | The split frame inside the layout        |
| `row`              | A row/column of children                 |
| `splitter`         | Resize handle between siblings           |
| `tabset`           | A pane holding tabs                      |
| `tabstrip`         | The strip of tabs at the top of a tabset |
| `tablist`          | The ARIA tablist                         |
| `tab` / `tab-item` | A single tab                             |
| `tabcontent`       | The selected tab's content region        |
| `tab-close`        | A tab's close button                     |
| `tab-rename`       | A tab's rename input                     |
| `tabset-toolbar`   | The tabset's toolbar                     |
| `tabset-maximize`  | The maximize/restore button              |
| `dock-indicator`   | The live drag-dock indicator             |
| `border`           | A border edge                            |
| `border-strip`     | A border's tab strip                     |
| `border-tab`       | A single border tab                      |
| `border-drawer`    | An expanded border drawer                |

```css
[data-dashfoo="tabset"] {
  background: #111;
  border: 1px solid #222;
}
[data-dashfoo="tab"][aria-selected="true"] {
  background: #1d1d1d;
}
[data-dashfoo="splitter"] {
  background: #222;
}
[data-dashfoo="dock-indicator"] {
  background: rgba(80, 140, 255, 0.3);
}
```

## Demo

`apps/demo-vite` is a neutral TanStack Router + Query showcase that drives dashfoo across a trading-terminal overview, a docking sandbox, the tabset chrome, border drawers, and persistence/controlled mode.

```bash
pnpm install
pnpm dev
```

## Docs and links

- **Guides** — `docs/guides/` (model shape, controlled vs uncontrolled, persistence, theming the `data-dashfoo` markup).
- **Architecture decisions** — `docs/adr/` (the record behind the headless engine, the one-XState-actor-system state model, and the pinned primitive choices).
- **Design spec** — [`docs/superpowers/specs/2026-06-02-dashfoo-design.md`](./docs/superpowers/specs/2026-06-02-dashfoo-design.md) — the full goals, non-goals, model, action set, machine map, and build sequence.

## Scripts

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | Start apps in development mode.            |
| `pnpm build`        | Build every package and app.               |
| `pnpm test`         | Run unit tests across the monorepo.        |
| `pnpm lint`         | Run oxlint.                                |
| `pnpm format`       | Format with oxfmt.                         |
| `pnpm format:check` | Check formatting without writing.          |
| `pnpm typecheck`    | Run TypeScript checks across the monorepo. |
| `pnpm clean`        | Clean all build artifacts.                 |

## Stack

- **Packages:** `@dashfoo/core`, `@dashfoo/react`, `@dashfoo/theme` (React 19, XState v5, zod, react-resizable-panels v4, `@dnd-kit/react` 0.4).
- **Build:** Turborepo + pnpm workspaces; tsdown per package (ESM, bundled `.d.ts`, tree-shaking, source maps).
- **Linting / formatting:** oxlint + oxfmt.
- **Testing:** Vitest — node tests for the core engine and machines, jsdom for the React layer.

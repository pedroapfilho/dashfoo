<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/dashfoo-logo-dark.svg">
    <img alt="dashfoo" src="./assets/dashfoo-logo-light.svg" width="320">
  </picture>
  <br />
  <br />
  <strong>A headless React docking-layout library — tiled, resizable, tabbed regions with a serializable model and zero imposed styling.</strong>
  <br />
  <br />
</div>

dashfoo builds VS-Code-style dashboards in React: nested rows and columns of resizable panes, each pane a tabset you can restack, split, reorder, rename, close, and maximize by dragging. The layout is a single serializable model — a plain object validated by zod — that is the one source of truth. The engine ships structure, not appearance: `@dashfoo/react` renders markup tagged with `data-dashfoo="..."` attributes and applies no CSS, so the chrome is yours to style.

It exists to deliver FlexLayout's power without FlexLayout's central weakness, chrome you cannot restructure. State lives in one XState actor system, document mutations run through a pure reducer, and the drag/resize primitives sit behind adapters you never touch.

**At a glance**

- **What it is.** A headless docking-layout engine for React: split/tab tree, drag-docking, resizable splitters, maximize, undo/redo.
- **What it gives you.** A serializable zod-validated model, a typed `<DashfooLayout>` component, controlled or uncontrolled state, and a `data-dashfoo` markup contract you style however you want.
- **Who it's for.** Apps that need real docking — trading terminals, IDEs, dashboards, monitoring consoles — and teams who want to own the look instead of fighting a prebuilt skin.
- **Built on.** `react-resizable-panels` (resize), `@dnd-kit/dom` `0.4.0` (drag, framework-agnostic core — no React bindings), XState v5 (state), zod (schema). All bundled, none exposed.

## Quickstart

```bash
pnpm add @dashfoo/core @dashfoo/react
# optional default skin (plain CSS, opt-in):
pnpm add @dashfoo/theme
```

Two things every setup needs: a **sized mount point** and a way to **resolve tab content**. `<DashfooLayout>` fills 100% of its parent, and in a fresh Vite or Next.js app the default `#root` has no height — without the CSS below the layout renders zero pixels tall and the page looks blank.

```css
/* src/index.css — give the mount chain a real height */
html,
body,
#root {
  height: 100%;
  margin: 0;
}
```

Build the layout with the model builders, then mount `<DashfooLayout>`. Tab content is never stored in the model — each `tab` carries a `component` key that you resolve to a React element, either through a `components` registry or a `factory` callback.

```tsx
// src/dashboard.tsx
import type { TabNode } from "@dashfoo/core";
import { model, row, tabset, tab } from "@dashfoo/core";
import { DashfooLayout } from "@dashfoo/react";

// Optional: the default skin. Without it the chrome is unstyled (headless).
import "@dashfoo/theme/dashfoo.css";

const startingModel = model(
  row([
    tabset([tab("chart", "Chart"), tab("depth", "Depth")], { id: "left", weight: 2 }),
    tabset([tab("book", "Order Book"), tab("trades", "Trades")], { id: "right", weight: 1 }),
  ]),
);

const ChartPanel = ({ node }: { node: TabNode }) => <div>{node.name} content</div>;

export const Dashboard = () => (
  <DashfooLayout
    defaultModel={startingModel}
    components={{
      chart: ChartPanel,
      depth: ChartPanel,
      book: ChartPanel,
      trades: ChartPanel,
    }}
  />
);
```

The builders (`model` / `row` / `tabset` / `tab`) fill the mechanical fields (`type`, `version`, `selected`) so you only write what matters; the output is the same plain object you could also write by hand (see [the model guide](https://docs.dashfoo.dev/the-model)).

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

That is the whole surface for a working dashboard: a model and a way to resolve tab content. Drag, resize, rename, close, and maximize come for free. One default worth knowing up front: inactive tab panels **unmount** when deselected, so their local React state resets on a tab switch — pass `keepMounted` to keep them alive instead.

## Highlights

- **Model is the source of truth.** The layout is a plain, JSON-serializable object validated by `dashfooSchema`. `toJSON` / `fromJSON` round-trip it losslessly because content never lives in the model, only a `component` registry key.
- **Headless by design.** `@dashfoo/react` renders markup with `data-dashfoo="..."` attributes and applies zero styling. Target those attributes with your own CSS, or drop in `@dashfoo/theme` — a framework-agnostic plain-CSS skin over overridable `--dashfoo-*` tokens, with an opt-in dark variant.
- **Batteries, still optional.** A `Panel` helper for common panel chrome, model builders, and a one-prop `persist="key"` for localStorage are there when you want them, and absent from the markup when you don't.
- **Controlled or uncontrolled.** Pass `defaultModel` and let the engine own state with built-in undo/redo, or pass `model` + `onModelChange` and own persistence yourself (backend, URL). Same model shape either way.
- **Pure reducer, self-healing tree.** Every change is one immutable `Action` run through `reducer(model, action)`. Invariants normalize after each action: empty tabsets are removed, single-child rows collapse, `selected` indices clamp, `maximizedTabsetId` clears when its tabset disappears.
- **Primitives stay internal.** `react-resizable-panels`, `@dnd-kit/dom`, and XState are bundled dependencies behind adapters, not peers. React and react-dom are the only true peer dependencies. A primitive version bump touches one adapter file, not your code.
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

| Package          | Purpose                                                                                                                                                                                                                                                                      | Install                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `@dashfoo/core`  | Pure TS engine. zod schema + derived types, the pure `reducer`, tree invariants, `resolveDockTarget` geometry, undo/redo history, `toJSON`/`fromJSON` validation, and the XState machines. No React.                                                                         | `pnpm add @dashfoo/core`  |
| `@dashfoo/react` | The React layer. `DashfooLayout`, the `Panel` helper, the store binding (controlled/uncontrolled + undo/redo), the `persist` prop + persistence hooks, and the `react-resizable-panels` + `@dnd-kit/dom` adapters. Renders headless `data-dashfoo` markup with zero styling. | `pnpm add @dashfoo/react` |
| `@dashfoo/theme` | Opt-in default skin for the headless chrome: framework-agnostic **plain CSS** (`@dashfoo/theme/dashfoo.css`) over overridable `--dashfoo-*` design tokens (`@dashfoo/theme/tokens.css`), with an opt-in dark theme. No Tailwind, no build step.                              | `pnpm add @dashfoo/theme` |

`@dashfoo/react` declares `react` and `react-dom` (`^18.3.1 || ^19.0.0`) as its only peers. The primitives — `xstate`, `@xstate/react`, `react-resizable-panels`, `@dnd-kit/*` — are bundled dependencies that never leak into your dependency tree. You install `@dashfoo/core` alongside `@dashfoo/react` because your own code imports it directly for the builders, types, and schema.

## Architecture

### Model as the source of truth

A `Dashfoo` model is a plain object: a `version`, a `global` attributes bag, and a root `layout` row. The tree nests three node kinds.

```ts
type Dashfoo = {
  version: 1; // pinned by the schema — a payload in any other format fails validation
  global: GlobalAttributes;
  layout: RowNode; // root is always a row
  activeTabsetId?: string;
  maximizedTabsetId?: string;
};
```

| Node         | Shape                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RowNode`    | `{ type: "row"; id; orientation: "row" \| "column"; weight?; min?; max?; children: (RowNode \| TabsetNode)[] }` — orientation is explicit, never inferred from depth.           |
| `TabsetNode` | `{ type: "tabset"; id; selected: number; name?; weight?; min?; max?; enableClose?; enableMaximize?; children: TabNode[] }` — a pane holding ordered tabs.                       |
| `TabNode`    | `{ type: "tab"; id; component: string; name: string; config?: Json; enableClose?; enableDrag?; enableRename? }` — `component` is a registry key; content is resolved at render. |

Sizing is responsive by default: `weight` is a proportional share within a row, so resized layouts stay fluid as the container changes. `Dimension` (`{ value, unit }`, with units `px` / `%` / `em` / `rem` / `vh` / `vw`) is reserved for `min` / `max` constraints and intentionally fixed panes. A tabset with no `min` of its own falls back to `global.tabSetMinSize` (a number, in px), and to `320px` when that global is also omitted.

### The core engine

`@dashfoo/core` is pure TypeScript with no React. Every document change is one immutable `Action` from a discriminated union — `addNode`, `moveNode`, `moveTabset`, `deleteTab`, `deleteTabset`, `renameTab`, `selectTab`, `setActiveTabset`, `adjustSplit`, `setMaximizedTabset`, `updateNodeAttributes`, `updateGlobalAttributes`. The engine is a pure function:

```ts
import { reducer, normalize, toJSON, fromJSON } from "@dashfoo/core";

const next = reducer(model, { type: "renameTab", tabId: "chart", name: "Price" });
```

The reducer is pure and immutable, runs the self-healing invariants (`normalize`) after every action, and validates action payloads against `actionSchema` at the boundary. `resolveDockTarget` is a pure geometry function: outer bands of a tabset resolve to a split, the center to a tab stack. Undo/redo is a pure helper over `past · present · future`; every committed action is one undo step, and a splitter drag lands as a single step because `react-resizable-panels` v4 commits one `adjustSplit` per release. Serialization is `toJSON` / `fromJSON`, the latter validating an untrusted payload against the schema (whose `version` field is pinned to the current format).

### The react adapters

`@dashfoo/react` binds a `dashfooMachine` actor to React. The two primitives are isolated behind adapters so the engine never imports them directly:

- The **resize adapter** wraps `react-resizable-panels`, mapping `weight` to percentage layout and `Dimension` to fixed/min/max panel sizes, and commits `adjustSplit`.
- The **drag adapter** drives the framework-agnostic `@dnd-kit/dom` `0.4.0` core imperatively (no React bindings). It renders its own drag-preview chip, hit-tests the pointer against the registered tabsets, forwards the lifecycle into the dock machine via `resolveDockTarget`, and commits `moveNode` (a tab drag) or `moveTabset` (a tabset dragged by its grip). Drag is **pointer-only** — see [the drag guide](https://docs.dashfoo.dev/drag-and-dock) for the a11y note.

XState is internal — it never appears in the public API. `useDashfooStore` exposes `{ model, dispatch, undo, redo, canUndo, canRedo, setModel }`; in controlled mode every change routes through `onModelChange`, in uncontrolled mode the actor owns the document with full undo/redo. Persistence is a single `persist="key"` prop (or the lower-level `usePersistence` hook): it debounce-saves the model to a swappable `StorageAdapter` (localStorage, sessionStorage, in-memory, or your own), validating on load.

### The headless data-dashfoo contract

`@dashfoo/react` renders structure and applies no styling. Every chrome element carries a stable `data-dashfoo` attribute you target from CSS:

| Attribute value                                               | Element                                              |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| `layout`                                                      | Root layout container                                |
| `row`                                                         | A row/column of children (resizable group)           |
| `splitter`                                                    | Resize handle between siblings                       |
| `tabset`                                                      | A pane holding tabs                                  |
| `tabstrip`                                                    | The strip of tabs at the top of a tabset             |
| `tablist`                                                     | The ARIA tablist                                     |
| `tab` / `tab-item`                                            | A tab button / its wrapper (label + close)           |
| `tabcontent`                                                  | The selected tab's content region                    |
| `tab-close`                                                   | A tab's close button                                 |
| `tab-rename`                                                  | A tab's rename input                                 |
| `tabset-toolbar`                                              | The tabset's toolbar                                 |
| `tabset-grip`                                                 | The drag grip that moves the whole tabset            |
| `tabset-maximize`                                             | The maximize/restore button                          |
| `tab-overflow` / `-menu` / `-item` / `-root`                  | The "more tabs" overflow menu                        |
| `panel` / `-header` / `-title` / `-icon` / `-badge` / `-body` | The `Panel` helper chrome                            |
| `dock-indicator`                                              | The live drag-dock indicator (insertion line / zone) |
| `drag-preview`                                                | The chip that follows the pointer while dragging     |

State hooks: `[data-dashfoo="tab-item"][data-dragging]` (a tab being dragged), `[data-dashfoo="tabset"][data-dragging-source]` (a tabset being dragged by its grip), `[aria-selected="true"]` on the active tab, `[aria-pressed="true"]` on a maximized tabset. The full token + attribute contract is in [the theming guide](https://docs.dashfoo.dev/theming).

```css
[data-dashfoo="tabset"] {
  background: #111;
  border: 1px solid #222;
}
[data-dashfoo="tab"][aria-selected="true"] {
  background: #1d1d1d;
}
/* Splitters ship with no intrinsic size — give them one or resize is unusable. */
[data-separator][aria-orientation="vertical"] {
  width: 6px;
  cursor: col-resize;
}
[data-separator][aria-orientation="horizontal"] {
  height: 6px;
  cursor: row-resize;
}
[data-dashfoo="splitter"] {
  background: #222;
}
[data-dashfoo="dock-indicator"] {
  background: rgba(80, 140, 255, 0.3);
}
```

Or skip writing chrome CSS entirely and import the default skin:

```ts
import "@dashfoo/theme/dashfoo.css"; // neutral oklch tokens, light by default
// opt into dark with <html data-dashfoo-theme="dark">
```

## Demo

`apps/demo-vite` is a neutral TanStack Router showcase that drives dashfoo across seven pages: an overview, a docking sandbox, the tabset chrome, persistence, controlled mode, responsive restructuring, and panel sizing.

Hosted demo: [demo.dashfoo.com](https://demo.dashfoo.com).

```bash
pnpm install
pnpm dev
```

## Docs and links

- **Documentation** — [docs.dashfoo.dev](https://docs.dashfoo.dev): [getting started](https://docs.dashfoo.dev/getting-started), [the model](https://docs.dashfoo.dev/the-model), [drag and dock](https://docs.dashfoo.dev/drag-and-dock), [controlled mode & history](https://docs.dashfoo.dev/controlled-and-history), [persistence](https://docs.dashfoo.dev/persistence), [responsive layouts](https://docs.dashfoo.dev/responsive), [theming](https://docs.dashfoo.dev/theming), and the [API reference](https://docs.dashfoo.dev/api-reference). The content lives in [`apps/docs/content/docs`](./apps/docs/content/docs) — the single source for the guides.
- **Package READMEs** — [`@dashfoo/core`](./packages/core/README.md), [`@dashfoo/react`](./packages/react/README.md), [`@dashfoo/theme`](./packages/theme/README.md) — per-package API reference, also shown on npm.
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

- **Packages:** `@dashfoo/core`, `@dashfoo/react`, `@dashfoo/theme` (React 19, XState v5, zod, react-resizable-panels v4, `@dnd-kit/dom` 0.4).
- **Build:** Turborepo + pnpm workspaces; tsdown per package (ESM, bundled `.d.ts`, tree-shaking, source maps).
- **Linting / formatting:** oxlint + oxfmt.
- **Testing:** Vitest — node tests for the core engine and machines, jsdom for the React layer.

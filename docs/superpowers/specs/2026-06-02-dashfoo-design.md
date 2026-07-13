# dashfoo — Design Spec

- **Date:** 2026-06-02
- **Status:** Approved (brainstorming) → ready for implementation plan
- **Owner:** Pedro Oliveira (pedro@filho.me)

## 1. What dashfoo is

A React docking-layout library for building dashboards: tiled, resizable regions holding tabbed panels — the FlexLayout / VS-Code mental model. It is built on two primitives, `react-resizable-panels` (resize) and `dnd-kit` (drag-and-drop), and exists to deliver FlexLayout's power **without** FlexLayout's central weakness: chrome you cannot restructure.

The reason to build it instead of using FlexLayout: dashfoo is **headless** (the engine ships structure, not appearance) with an **opt-in themeable skin**. Every visual piece is a swappable component or render prop. Layout state is a **serializable model** that is the single source of truth, driven by a single **XState actor system**.

## 2. Goals and non-goals

### Goals (v1)

- Tiled split layout: nested rows/columns, responsive weight sizing, optional fixed/constraint sizing, resizable splitters.
- Tabsets: ordered tabs, select, drag-to-reorder within and across tabsets, overflow menu, wrap, rename, close.
- Drag-docking: center (stack as tab), edges (split), frame edges (dock to a layout side / promote to border), with live indicators and keyboard docking.
- Maximize / restore a tabset.
- Border drawers on all four edges: collapsible, pinned or auto-hide.
- Serializable model: `toJSON` / `fromJSON`, zod-validated, schema-versioned with migrations.
- Undo / redo.
- Controlled and uncontrolled usage; content supplied by a registry.
- Headless core + opt-in themeable skin (Base UI + Tailwind v4 + CSS tokens).
- Full keyboard + WAI-ARIA support; APCA contrast; reduced-motion.

### Non-goals (deliberately out of v1)

- **Popout into native browser windows.** Removed: it drags in cross-document portals, ResizeObserver-bound-to-main-window bugs, background-timer throttling, and reload-while-maximized edge cases — the caveat-heavy 20% almost nobody needs.
- **In-document floating panels.** A tabset cannot detach and float over the layout. Everything stays tiled.
- **Nested sub-layouts** (a full dashfoo inside a tab).
- **Free 2D grid** (react-grid-layout / gridstack absolute x/y/w/h). dashfoo is a split/tab tree, not a coordinate canvas.

These can be added later behind the same model + actor system without reworking the engine.

## 3. Architecture overview

Three published packages plus internal config packages.

```
@dashfoo/core    pure TS · no React · the engine
@dashfoo/react   headless hooks + unstyled components + primitive adapters ('use client')
@dashfoo/theme   opt-in styled skin (Base UI + Tailwind v4) + CSS design tokens
```

Data flow is unidirectional:

```
user gesture
  → dnd-kit / rrp sensor events
    → an XState interaction machine (drag-dock / rename / resize / border)
      → on a valid terminal transition, sends ONE document Action
        → root machine's document region runs the pure reducer (model, action) => model
          → React re-renders from the new model via @xstate/react selectors
            → onModelChange fires (controlled) / persistence subscription saves (uncontrolled)
```

Interaction machines hold transient state only and never mutate the document directly; the document region holds the model only and never holds transient drag state. The two never overlap.

## 4. The core model

The model is the single source of truth and is fully serializable. Content is **never** stored in the model — only a `component` registry key. Types are derived from zod schemas via `z.infer`, so schema and types never drift.

```ts
type Edge = "top" | "bottom" | "left" | "right";
type Unit = "px" | "%" | "em" | "rem" | "vh" | "vw";
type Dimension = { value: number; unit: Unit };
type BorderMode = "pinned" | "auto-hide";

type TabNode = {
  type: "tab";
  id: string;
  component: string; // registry key — resolves to a React element
  name: string;
  config?: Json; // arbitrary per-tab app state, serialized with the model
  icon?: string;
  enableClose?: boolean;
  enableRename?: boolean;
  enableDrag?: boolean;
};

type TabsetNode = {
  type: "tabset";
  id: string;
  weight?: number; // proportional share within its parent row
  size?: Dimension; // optional fixed size for intentional non-responsive panes
  min?: Dimension;
  max?: Dimension;
  selected: number; // index of the active tab
  enableMaximize?: boolean;
  enableClose?: boolean;
  children: TabNode[];
};

type RowNode = {
  type: "row";
  id: string;
  orientation: "row" | "column"; // explicit, not inferred from depth
  weight?: number;
  children: Array<RowNode | TabsetNode>;
};

type BorderNode = {
  type: "border";
  edge: Edge;
  size?: Dimension;
  selected: number; // -1 = collapsed
  mode?: BorderMode;
  children: TabNode[];
};

type GlobalAttributes = {
  tabEnableClose?: boolean;
  tabEnableRename?: boolean;
  tabSetEnableMaximize?: boolean;
  tabSetEnableTabStrip?: boolean; // false → pure resizable-pane grid (no tabs)
  tabLocation?: "top" | "bottom";
  splitterSize?: number;
  splitterExtra?: number; // extra hit area
  enableSplitDock?: boolean;
  enableBorderDock?: boolean;
  borderAutoHideDelayMs?: number;
  // …defaults cascade down to nodes that omit the attribute
};

type Dashfoo = {
  version: number; // schema version for migrations
  global: GlobalAttributes;
  layout: RowNode; // root is always a row
  borders: BorderNode[]; // 0–4, one per edge
  activeTabsetId?: string;
  maximizedTabsetId?: string;
};
```

### Sizing model

- `weight` is the default and persisted split sizing model. Only ratios matter, so resized dashboards stay responsive as the container changes.
- Resize gestures update row child weights via `adjustSplit`; the saved model does not become pixel-bound just because the user dragged a splitter.
- `Dimension` is unit-typed for `min` / `max` constraints and intentionally fixed surfaces such as borders or explicit fixed sidebars. It is not the normal split-sizing path.
- The resize adapter maps weights to `react-resizable-panels` `Group` percentage layout, and maps `Dimension` values to `Panel` fixed/default/min/max sizes where needed. The core stays sizing-engine-agnostic.

### Three deliberate departures from FlexLayout

1. **Explicit `orientation`** on every row (FlexLayout alternates implicitly by depth) — easier to read, serialize, and reason about.
2. **Responsive weight sizing by default**, with unit-typed constraints and fixed edge/sidebar sizes when needed.
3. **`component` is a registry key, content never in the model** — `toJSON()` is trivial and lossless.

### Identity

Every node carries a stable string `id` (generated on import if absent). Ids are the currency of all actions and of dnd-kit / sortable / rrp keys.

## 5. Actions and the pure reducer

Every change to the document is an immutable `Action`. The reducer is a pure function and the canonical engine; the actor system invokes it.

```ts
type DockLocation =
  | "center" // add as tab
  | "split-left"
  | "split-right"
  | "split-top"
  | "split-bottom"
  | "border-left"
  | "border-right"
  | "border-top"
  | "border-bottom";

type MutableTabAttrs = Partial<
  Pick<TabNode, "name" | "config" | "icon" | "enableClose" | "enableRename" | "enableDrag">
>;
type MutableTabsetAttrs = Partial<
  Pick<
    TabsetNode,
    "weight" | "size" | "min" | "max" | "selected" | "enableMaximize" | "enableClose"
  >
>;
type MutableRowAttrs = Partial<Pick<RowNode, "orientation" | "weight">>;
type MutableBorderAttrs = Partial<Pick<BorderNode, "size" | "selected" | "mode">>;
type MutableNodeAttrs = MutableTabAttrs | MutableTabsetAttrs | MutableRowAttrs | MutableBorderAttrs;

type Action =
  | { type: "addNode"; tab: TabNode; targetId: string; location: DockLocation; index?: number }
  | { type: "moveNode"; sourceId: string; targetId: string; location: DockLocation; index?: number }
  | { type: "deleteTab"; tabId: string }
  | { type: "deleteTabset"; tabsetId: string }
  | { type: "renameTab"; tabId: string; name: string }
  | { type: "selectTab"; tabsetId: string; index: number }
  | { type: "setActiveTabset"; tabsetId: string }
  | { type: "adjustSplit"; rowId: string; weights: number[] }
  | { type: "adjustBorderSize"; edge: Edge; size: Dimension }
  | { type: "setBorderSelected"; edge: Edge; index: number } // open / collapse drawer
  | { type: "setMaximizedTabset"; tabsetId: string | null }
  | { type: "updateNodeAttributes"; nodeId: string; attrs: MutableNodeAttrs }
  | { type: "updateGlobalAttributes"; attrs: Partial<GlobalAttributes> };

const reducer: (model: Dashfoo, action: Action) => Dashfoo;
```

Reducer guarantees:

- **Pure and immutable** (structural sharing; Immer via the machine's `assign`).
- **Self-healing invariants** — empty tabsets are removed, single-child rows collapse, `selected` indices are clamped, `activeTabsetId` always points at an existing tabset when one exists, and `maximizedTabsetId` is cleared if its tabset disappears. These run after every action so the tree stays canonical.
- **Action payloads are zod-validated** at the boundary; ids are checked to exist before mutation.

History (undo / redo) is a pure helper around the reducer: `past[] · present · future[]`, with resize mutations (splitter/border drag) coalesced so a drag is one undo step, not one per frame.

## 6. State architecture — one XState actor system

The entire engine is a single XState actor system. `@xstate/store` is subsumed: the document lives in the root machine's `context`. XState is internal — it never appears in the public API.

### Root: `dashfooMachine`

The root machine owns document state and spawned interactions:

- **`document`** — receives document events, and its transitions run the pure reducer inside `assign`. The reducer stays a pure function the machine invokes, keeping the document action set testable as one unit instead of scattering mutation logic across transitions. Holds `{ model, history }`.
- **`interactions`** — spawns / invokes drag, resize, rename, and border machines. Maximize / restore is document state, persisted as `model.maximizedTabsetId`; it is not a separate transient flag.

### Child interaction machines

Spawned / invoked by the root, each fed by dnd-kit / rrp events, each committing exactly **one Action** back to the document region on success:

| Machine                          | Lifecycle                                                                                     | Consumes                                            | Commits                            |
| -------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| `dragDockMachine`                | `idle → armed → dragging → evaluating(target, hysteresis, pointer/keyboard) → drop \| cancel` | dnd-kit sensors + pure `resolveDockTarget` geometry | `moveNode` / `addNode`             |
| `renameMachine`                  | `idle → editing → commit \| cancel` (empty-name guard)                                        | input events                                        | `renameTab`                        |
| `resizeMachine`                  | `idle → resizing → commit` (realtime vs deferred)                                             | rrp `onLayout(Changed)`                             | `adjustSplit` / `adjustBorderSize` |
| `borderMachine` (one per border) | `collapsed ↔ expanded`; auto-hide adds `peek` + delayed collapse                              | pointer enter/leave + `after` timers                | `setBorderSelected`                |

Tab reorder folds into `dragDockMachine` (it is just a `moveNode` with `location: "center"` / index). The machines are the **coordinators**; dnd-kit and rrp remain the input transports — no lifecycle is duplicated.

### Machine definitions are pure and in core

`@dashfoo/core/machines/*` are `setup().createMachine()` definitions with no DOM dependency. They are **unit-tested headlessly**: create an actor, send a scripted event sequence, assert the snapshot state and that the expected Action was emitted. The gnarliest code in the library gets deterministic tests with zero rendering.

### Persistence

XState's first-class snapshot APIs (`actor.getPersistedSnapshot()` / `createActor(machine, { snapshot })`), **partialized to the model only** (transient interaction state is never persisted) and **zod-validated on hydrate** with `version` + `migrate`.

- **Uncontrolled:** a persistence subscription saves the model to swappable storage (localStorage → cookie → server).
- **Controlled:** `onModelChange` emits; the host owns persistence (backend / URL).

### Inspector

The Stately / Redux-DevTools inspector spans the **whole** engine — document and every interaction — enabling end-to-end time-travel debugging of any layout bug. Wired via an optional `inspect` prop in dev.

## 7. Control API

```tsx
<DashfooLayout
  // controlled …
  model={model}
  onModelChange={(next, action) => setModel(next)}
  // … or uncontrolled
  defaultModel={initialModel}
  components={{ chart: ChartPanel, book: OrderBook }} // registry by key
  // or: factory={(tab) => <…>}

  onAction={(action) => action /* return undefined to veto, or a replacement */}
  ref={layoutRef} // imperative API
  slots={{ Tab, TabStrip, Splitter, DockIndicator, BorderTab }}
  inspect={import.meta.env.DEV}
  onActorRef={(actor) => {
    /* power users: inspect / subscribe */
  }}
/>
```

- **Controlled** (`model` + `onModelChange`) or **uncontrolled** (`defaultModel`) — same model shape, host chooses who owns state.
- **`onAction`** intercepts before commit (veto or replace) — FlexLayout's `onAction` contract.
- **`ref`** exposes imperative helpers: `dispatch(action)`, `addTab`, `getModel`, `undo`, `redo`, `toJSON`.
- **Content** via a `components` registry or a `factory` callback; content is never in the model.
- The public surface is plain model + actions + slots — **no XState knowledge required** to use dashfoo.

## 8. React rendering layer — headless, slot-driven

`@dashfoo/react` ships **structure only**. Two consumption levels:

1. **Slots** — override any chrome piece while keeping the engine's structure:
   `Tab` (`{ node, isActive, isDragging, listeners, close }`), `TabStrip` (`{ tabset, tabs, overflow }`), `Splitter`, `DockIndicator`, `BorderTab`.
2. **Hooks** — build entirely bespoke chrome: `useDashfoo()`, `useTabset(id)`, `useTab(id)`, `useTabStrip(id)`, `useDockDrop()`, `useMaximize()`, `useBorder(edge)`. Each returns state + behavior (handlers, ARIA props), no markup.

### Adapters isolate the primitives

The only modules that import the primitives are the adapters, which expose stable in-house interfaces:

- `ResizeAdapter` wraps `react-resizable-panels` v4 (`Group` / `Panel` / `Separator`), mapping responsive weights plus `Dimension` constraints/fixed sizes and feeding `resizeMachine`.
- `DragAdapter` wraps the new `dnd-kit` (`@dnd-kit/react` `DragDropProvider`, `useDraggable` / `useDroppable` / `useSortable`, per-droppable `CollisionDetector`s, `@dnd-kit/helpers` `move`). It forwards the drag lifecycle into `dragDockMachine` via **`useDragDropMonitor`** (`onDragStart` / `onDragMove` / `onDragOver` / `onCollision` / `onDragEnd`, with `event.canceled` distinguishing drop from cancel).

A primitive version bump (rrp v4 → v2/3, `@dnd-kit/react` 0.4 → 0.5/1.0) touches one adapter file, not the engine.

## 9. Docking and drag-and-drop

- **Drop geometry is pure** in core: `resolveDockTarget(pointer, rect, opts) → { kind: "tab" | "split" | "border"; edge? }`. Outer ~22% bands of a tabset = split (`split-left` / `split-right` / `split-top` / `split-bottom`); center = add as tab; the frame's outer band = dock to a layout side / promote to border (`border-left` / `border-right` / `border-top` / `border-bottom`). **Hysteresis** at boundaries prevents flicker.
- A **custom `CollisionDetector`** (`(input: CollisionDetectorInput) => Collision | null`) wraps `resolveDockTarget`, set **per droppable** so each tabset owns its own edge/center hit-testing — a better fit for docking than a single global detector. Built-ins (`shapeIntersection` default, `pointerIntersection`, `closestCenter`) compose as fallbacks.
- **Tab reorder** via `useSortable` (from `@dnd-kit/react/sortable`) + the `move` helper from `@dnd-kit/helpers`. An unclipped drag preview (dnd-kit's drag feedback/overlay) carries the ghost across regions.
- **Indicators** are driven off the live collision result (surfaced through `useDragDropMonitor`) and rendered by the `DockIndicator` slot — `transform` / `opacity` only, `prefers-reduced-motion` honored.
- **Keyboard docking:** dnd-kit's built-in keyboard sensor cycles dock targets with arrow keys; `aria-live` announces the zone. `dragDockMachine` tracks `via: "pointer" | "keyboard"`.

## 10. Borders

Edge-docked tab drawers on any of the four frame edges. Collapsible (`selected: -1`), either pinned or auto-hide via `mode`. Auto-hide is handled inside `borderMachine` using `after` delayed transitions for peek/expand/collapse timing. Borders are sized with `Dimension` (fixed px is the common case) via the resize adapter.

## 11. Theming — `@dashfoo/theme`

- A skin **composed from** the headless components (never a fork). Uses **Base UI** (`@base-ui/react`) for the interactive bits — overflow menu, context menu, tooltips, rename popover — consistent with the user's `acme` `@repo/ui`. Layout and spacing via **Tailwind v4**.
- **`@dashfoo/theme/tokens.css`** — CSS custom properties: surfaces, borders, tab states, splitter, dock-indicator, radii, shadows, motion. Light / dark via `color-scheme` + token swap. Nested radii (child ≤ parent), layered shadows, **APCA** contrast, contrast bumped on `:hover` / `:focus` / `:active`. Drop it in, or map your own design system onto the same token names.

## 12. Accessibility and interaction

- Tabs follow the WAI-ARIA Tabs pattern (roving tabindex, `aria-selected`, arrow-key navigation).
- `:focus-visible` rings everywhere; focus trap/return for the rename popover; focus moves to a sensible target after close/move.
- Full keyboard docking (above) with `aria-live` announcements.
- Hit targets ≥ 24px (splitter `splitterExtra` widens the grab area); `touch-action: manipulation` on handles.
- `prefers-reduced-motion` honored; only `transform` / `opacity` animate; no `transition: all`.
- No color-only status; tabular numbers where sizes are shown.

## 13. FlexLayout parity checklist

In v1: JSON model (global/layout/borders; row/tabset/tab/border nodes) · splitters + responsive weights + fixed border/sidebar sizing + min/max · tab drag-reorder (within + across) · tabset move · center + split + border docking with indicators · `enableSplitDock` / `enableBorderDock` gating · allow-drop veto (`onAction`) · maximize/restore · active-tabset tracking · borders (4 edges, collapsible, pinned or auto-hide) · tab overflow menu + wheel scroll + wrap · double-click rename · close buttons · tab location top/bottom · single-tab stretch · render-on-demand · `factory` content resolution · `toJSON`/`fromJSON` + per-tab `config` · Actions/dispatch with interceptable `onAction` + post-commit `onModelChange` · customization hooks (icons, classNames via slots, i18n) · per-node resize/close/visibility events.

Out (per non-goals): popout to native window · floating panels · sub-layouts.

## 14. Packages

### `@dashfoo/core`

Pure TS, ESM-only, framework-agnostic. Built with `tsdown` (ESM + bundled `.d.ts`, `sideEffects:false`, `files:["dist"]`).

- Exports: `.` (model types, schemas, actions, reducer, serialize, geometry, machines, store factory).
- Dependencies: `xstate`, `zod` (internal — consumers do not touch them).
- No React.

### `@dashfoo/react`

ESM-only, `'use client'`. `tsdown` build.

- Exports: `.` (`DashfooLayout`, hooks), `./adapters` (advanced).
- Peer dependencies: `react` `^18.3.1 || ^19.0.0`, `react-dom` `^18.3.1 || ^19.0.0` — the only true peers (React must be a singleton shared with the host).
- Dependencies (the primitives are internal implementation details, so they are bundled, not peers — one-line install for consumers): `@dashfoo/core` (`workspace:*`), `xstate`, `@xstate/react`, `react-resizable-panels` (v4, exact-pinned), `@dnd-kit/react` (exact `0.4.0`), `@dnd-kit/helpers` (exact `0.4.0`). `@dnd-kit/react` pulls `@dnd-kit/dom · abstract · state · collision · geometry` transitively (`@dnd-kit/state` brings `@preact/signals-core`).
- The pre-1.0 dnd-kit packages are **exact-pinned** (no caret); a Renovate/Dependabot rule requires manual review before any 0.x minor bump.

### `@dashfoo/theme`

ESM-only. `tsdown` build + a published `tokens.css`.

- Exports: `.` (themed components), `./tokens.css`.
- Dependencies: `@base-ui/react`, `clsx`, `tailwind-merge`.
- Peer dependencies: `@dashfoo/react` (`workspace:*` in repo), `react`, `tailwindcss` `^4`.

### Internal config (private, `@repo/*`, version `0.0.0`)

- `@repo/typescript-config` — `base.json` (strict, `moduleResolution: Bundler`, `isolatedModules`, `noEmit`), `react-library.json` (adds `jsx: react-jsx`).
- `@repo/config-vitest` — `./node`, `./react`, `./setup-react` presets.

## 15. Repository layout

```
dashfoo/
  package.json                 private root; scripts delegate to turbo; release pipeline
  pnpm-workspace.yaml          packages: [packages/*, apps/*]; nodeLinker hoisted
  turbo.json                   build/lint/typecheck/test (dependsOn ^build)
  oxlint.config.ts  .oxfmtrc.json
  .changeset/config.json       access public, baseBranch main
  .github/workflows/           release.yml (changesets + npm provenance), lint/test
  packages/
    core/        @dashfoo/core
    react/       @dashfoo/react
    theme/       @dashfoo/theme
    config-typescript/   @repo/typescript-config
    config-vitest/       @repo/config-vitest
  apps/
    demo-vite/   private — Vite playground
    demo-next/   private — Next.js (RSC) playground, 'use client' boundary verified
  docs/superpowers/specs/2026-06-02-dashfoo-design.md
```

## 16. Tooling, build, tests, publish

Matches `usebutr` exactly where it is the publishable-library template.

- **pnpm@11.1.3 · Turborepo ^2.9 · Node ≥24 · ESM-only** (`type:module`).
- **Lint / format:** `oxlint` + `oxfmt` at root; thin per-package `lint` scripts.
- **Build:** `tsdown` per package — ESM, bundled `.d.ts`, `minify`, `treeshake`, `target es2022`, `sourcemap`, `sideEffects:false`, `files:["dist"]`.
- **Types:** TypeScript 6 via `@repo/typescript-config`; strict, `tsc --noEmit` for typecheck (tsdown emits the real `.d.ts`).
- **Tests:**
  - `@dashfoo/core` → Vitest **node**: reducer invariants, serialize round-trip + migrations, `resolveDockTarget` geometry, and **headless machine tests** (scripted events → asserted snapshots + emitted Actions). This is the highest-value test surface.
  - `@dashfoo/react` → Vitest **jsdom** + Testing Library: hooks, slots, controlled/uncontrolled wiring.
  - `apps/*` → **Playwright**: real drag-dock, resize, reorder, keyboard-dock flows that unit tests cannot cover.
- **Demos:** real framework apps (Vite + Next), private — no Storybook, matching usebutr.
- **Release:** Changesets + GitHub Actions, npm **provenance** (`id-token: write`, `NPM_CONFIG_PROVENANCE`), `@dashfoo/*` scope, `publishConfig.access: public`, `updateInternalDependencies: patch`.

## 17. Technical decisions log

| Decision | Choice | Rationale |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------- |
| Layout representation | Serializable model tree (single source of truth) | Trivial `toJSON`/`fromJSON`; controlled state; matches FlexLayout's strength |
| Customization | Headless core + opt-in themeable skin | Directly fixes FlexLayout's un-restructurable chrome — dashfoo's reason to exist |
| State foundation | One XState actor system (document + interactions) | User decision: uniform paradigm, statechart rigor, single inspector, first-class persistence |
| Document mutation | Pure reducer invoked inside the machine | Keep document mutations testable as a function; machine is the actor shell |
| Validation | zod schemas; `z.infer` for types | One source for schema + types; guards import / action payloads |
| Resize primitive | `react-resizable-panels` **v4**, adapter-isolated | Group layout remains percentage/weight-friendly, while panels support fixed units for constraints/borders/sidebars; SSR/RSC; isolated so downgrade is one file |
| DnD primitive | `dnd-kit` **new line — `@dnd-kit/react` 0.4.0** (exact-pinned), adapter-isolated | A greenfield lib shouldn't build on the feature-frozen legacy 6.x; the new line is maintainer-recommended for new projects, React-19-ready, and its **per-droppable collision detectors + `useDragDropMonitor`** fit a docking engine better. Pre-1.0 risk contained by exact pins + the adapter |
| React support | peer `^18.3.1                                                                    |                                                                                                                                                                                                                                                                                                  | ^19.0.0` | Develop on 19, widen for adoption |
| XState ecosystem | Internal **dependencies** (not peers) | Consumers never touch them; one-line install; peers stay react/rrp/dnd-kit |
| Theme primitives | Base UI (`@base-ui/react`) + Tailwind v4 | Consistent with `acme` `@repo/ui`; tokens over class-string swapping |
| Publish | OSS, scoped `@dashfoo/*`, Changesets + provenance | Sits alongside the user's other OSS libs; usebutr pipeline |

## 18. Risks and mitigations

- **All-XState ceremony / contributor ramp.** Mitigation: keep document mutation in a pure reducer the machine invokes; machine definitions are small, pure, and individually tested; the inspector lowers the debugging cost.
- **rrp v4 newness.** Mitigation: adapter isolation; pin an exact version; the swap to battle-tested v2/3 is a one-file change.
- **dnd-kit new line is pre-1.0 (0.4.0, active 0.5 beta).** Mitigation: exact-pin all `@dnd-kit/*` (no caret), gate 0.x bumps behind manual review, and isolate behind the `DragAdapter`; `@dnd-kit/react` already ships its own `'use client'` directive. Note `@preact/signals-core` enters the bundle transitively via `@dnd-kit/state`.
- **Custom dock collision is the hard part.** Mitigation: geometry is a pure, unit-tested function with hysteresis; Playwright covers the integrated gesture.
- **SSR / RSC.** Mitigation: `'use client'` boundary on `@dashfoo/react`; verified in `apps/demo-next`; rrp v4 SSR support.

## 19. Build sequence (high level)

The detailed step-by-step plan is produced next by the writing-plans process. Intended order:

1. Monorepo scaffold (pnpm/turbo/oxlint/oxfmt, `@repo/*` config packages, empty `@dashfoo/*` packages, CI, Changesets).
2. `@dashfoo/core`: zod schema + types → pure reducer + invariants + history → serialize/migrate → `resolveDockTarget` geometry. Unit-tested first (TDD).
3. `@dashfoo/core`: the XState actor system (root regions + interaction machines), headless-tested.
4. `@dashfoo/react`: store binding, `DashfooLayout`, registry/factory, controlled/uncontrolled, hooks, slots.
5. `@dashfoo/react`: `ResizeAdapter` (rrp) and `DragAdapter` (dnd-kit) wired to the machines; indicators; keyboard docking.
6. Borders + maximize + overflow/rename/close.
7. `@dashfoo/theme`: tokens + Base-UI-composed skin.
8. `apps/demo-vite` + `apps/demo-next`; Playwright flows.
9. Persistence presets, docs/examples, release wiring.

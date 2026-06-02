# dashfoo — Design Spec

- **Date:** 2026-06-02
- **Status:** Approved (brainstorming) → ready for implementation plan
- **Owner:** Pedro Oliveira (pedro@filho.me)

## 1. What dashfoo is

A React docking-layout library for building dashboards: tiled, resizable regions holding tabbed panels — the FlexLayout / VS-Code mental model. It is built on two primitives, `react-resizable-panels` (resize) and `dnd-kit` (drag-and-drop), and exists to deliver FlexLayout's power **without** FlexLayout's central weakness: chrome you cannot restructure.

The reason to build it instead of using FlexLayout: dashfoo is **headless** (the engine ships structure, not appearance) with an **opt-in themeable skin**. Every visual piece is a swappable component or render prop. Layout state is a **serializable model** that is the single source of truth, driven by a single **XState actor system**.

## 2. Goals and non-goals

### Goals (v1)
- Tiled split layout: nested rows/columns, weight + pixel sizing, resizable splitters.
- Tabsets: ordered tabs, select, drag-to-reorder within and across tabsets, overflow menu, wrap, rename, close.
- Drag-docking: center (stack as tab), edges (split), frame edges (dock to a layout side / promote to border), with live indicators and keyboard docking.
- Maximize / restore a tabset.
- Border drawers on all four edges: collapsible, auto-hide.
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
    → an XState interaction machine (drag-dock / rename / resize / border-autohide)
      → on a valid terminal transition, sends ONE document Action
        → root machine's document region runs the pure reducer (model, action) => model
          → React re-renders from the new model via @xstate/react selectors
            → onModelChange fires (controlled) / persistence subscription saves (uncontrolled)
```

Interaction machines hold transient state only and never mutate the document directly; the document region holds the model only and never holds transient drag state. The two never overlap.

## 4. The core model

The model is the single source of truth and is fully serializable. Content is **never** stored in the model — only a `component` registry key. Types are derived from zod schemas via `z.infer`, so schema and types never drift.

```ts
type Edge = "top" | "bottom" | "left" | "right"
type Unit = "px" | "%" | "fr" | "rem"
type Dimension = { value: number; unit: Unit }

type TabNode = {
  type: "tab"
  id: string
  component: string          // registry key — resolves to a React element
  name: string
  config?: Json              // arbitrary per-tab app state, serialized with the model
  icon?: string
  enableClose?: boolean
  enableRename?: boolean
  enableDrag?: boolean
}

type TabsetNode = {
  type: "tabset"
  id: string
  weight?: number            // proportional share within its parent row
  size?: Dimension           // fixed size (overrides weight when present)
  min?: Dimension
  max?: Dimension
  selected: number           // index of the active tab
  active?: boolean           // is this the active tabset
  enableMaximize?: boolean
  enableClose?: boolean
  children: TabNode[]
}

type RowNode = {
  type: "row"
  id: string
  orientation: "row" | "column"   // explicit, not inferred from depth
  weight?: number
  children: Array<RowNode | TabsetNode>
}

type BorderNode = {
  type: "border"
  edge: Edge
  size?: Dimension
  selected: number           // -1 = collapsed
  autoHide?: boolean
  children: TabNode[]
}

type GlobalAttributes = {
  tabEnableClose?: boolean
  tabEnableRename?: boolean
  tabSetEnableMaximize?: boolean
  tabSetEnableTabStrip?: boolean   // false → pure resizable-pane grid (no tabs)
  splitterSize?: number
  splitterExtra?: number           // extra hit area
  enableEdgeDock?: boolean
  borderAutoHideDelay?: number     // ms
  // …defaults cascade down to nodes that omit the attribute
}

type Dashfoo = {
  version: number            // schema version for migrations
  global: GlobalAttributes
  layout: RowNode            // root is always a row
  borders: BorderNode[]      // 0–4, one per edge
}
```

### Sizing model
- `weight` drives proportional sizing within a row (only ratios matter), mirroring FlexLayout.
- `Dimension` is **unit-typed** (`px` / `%` / `fr` / `rem`) for fixed sizes and `min` / `max` constraints. A fixed-pixel sidebar or border "just works."
- The unit-typed dimension is what the resize adapter maps onto whichever `react-resizable-panels` major is in use, so the core is sizing-engine-agnostic.

### Three deliberate departures from FlexLayout
1. **Explicit `orientation`** on every row (FlexLayout alternates implicitly by depth) — easier to read, serialize, and reason about.
2. **Unit-typed sizing** instead of percent-only.
3. **`component` is a registry key, content never in the model** — `toJSON()` is trivial and lossless.

### Identity
Every node carries a stable string `id` (generated on import if absent). Ids are the currency of all actions and of dnd-kit / sortable / rrp keys.

## 5. Actions and the pure reducer

Every change to the document is an immutable `Action`. The reducer is a pure function and the canonical engine; the actor system invokes it.

```ts
type DockLocation =
  | "center"                                   // add as tab
  | "left" | "right" | "top" | "bottom"        // split target tabset
  | "edgeLeft" | "edgeRight" | "edgeTop" | "edgeBottom"  // dock to a frame edge / border

type Action =
  | { type: "addNode"; tab: TabNode; targetId: string; location: DockLocation; index?: number }
  | { type: "moveNode"; sourceId: string; targetId: string; location: DockLocation; index?: number }
  | { type: "deleteTab"; tabId: string }
  | { type: "deleteTabset"; tabsetId: string }
  | { type: "renameTab"; tabId: string; name: string }
  | { type: "selectTab"; tabsetId: string; index: number }
  | { type: "setActiveTabset"; tabsetId: string }
  | { type: "adjustSplit"; rowId: string; sizes: Dimension[] }
  | { type: "adjustBorderSize"; edge: Edge; size: Dimension }
  | { type: "setBorderSelected"; edge: Edge; index: number }   // open / collapse drawer
  | { type: "maximizeToggle"; tabsetId: string }
  | { type: "updateNodeAttributes"; nodeId: string; attrs: Partial<TabNode | TabsetNode | RowNode | BorderNode> }
  | { type: "updateGlobalAttributes"; attrs: Partial<GlobalAttributes> }

const reducer: (model: Dashfoo, action: Action) => Dashfoo
```

Reducer guarantees:
- **Pure and immutable** (structural sharing; Immer via the machine's `assign`).
- **Self-healing invariants** — empty tabsets are removed, single-child rows collapse, `selected` indices are clamped, an active tabset always exists. These run after every action so the tree stays canonical.
- **Action payloads are zod-validated** at the boundary; ids are checked to exist before mutation.

History (undo / redo) is a pure helper around the reducer: `past[] · present · future[]`, with size mutations (resize/border-drag) coalesced so a drag is one undo step, not one per frame.

## 6. State architecture — one XState actor system

The entire engine is a single XState actor system. `@xstate/store` is subsumed: the document lives in the root machine's `context`. XState is internal — it never appears in the public API.

### Root: `dashfooMachine`
Two parallel regions:

- **`document`** — receives document events, and its transitions run the pure reducer inside `assign`. The reducer stays a pure function the machine invokes (12 action types are cleaner as one tested function than 12 hand-written transitions). Holds `{ model, history }`.
- **`viewMode`** — `normal ↔ maximized(tabsetId)`. Maximize is a state, not a flag, so the engine is uniform.

### Child interaction machines
Spawned / invoked by the root, each fed by dnd-kit / rrp events, each committing exactly **one Action** back to the document region on success:

| Machine | Lifecycle | Consumes | Commits |
|---|---|---|---|
| `dragDockMachine` | `idle → armed → dragging → evaluating(target, hysteresis, pointer/keyboard) → drop \| cancel` | dnd-kit sensors + pure `resolveDockTarget` geometry | `moveNode` / `addNode` |
| `renameMachine` | `idle → editing → commit \| cancel` (empty-name guard) | input events | `renameTab` |
| `resizeMachine` | `idle → resizing → commit` (realtime vs deferred) | rrp `onLayout(Changed)` | `adjustSplit` / `adjustBorderSize` |
| `borderAutoHideMachine` (one per auto-hide border) | `collapsed → peek → expanded → (after delay) collapsed` | pointer enter/leave + `after` timers | `setBorderSelected` |

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

  components={{ chart: ChartPanel, book: OrderBook }}  // registry by key
  // or: factory={(tab) => <…>}

  onAction={(action) => action /* return undefined to veto, or a replacement */}
  ref={layoutRef}                                       // imperative API
  slots={{ Tab, TabStrip, Splitter, DockIndicator, BorderTab }}
  inspect={import.meta.env.DEV}
  onActorRef={(actor) => { /* power users: inspect / subscribe */ }}
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
- `ResizeAdapter` wraps `react-resizable-panels` (`Group` / `Panel` / `Separator`), mapping `Dimension` sizes and feeding `resizeMachine`.
- `DragAdapter` wraps `dnd-kit` (`DndContext`, sensors, custom collision, `DragOverlay`, `@dnd-kit/sortable`), feeding `dragDockMachine`.

A primitive version bump (rrp v4 → v2/3, dnd-kit legacy → `@dnd-kit/react` 1.0) touches one adapter file, not the engine.

## 9. Docking and drag-and-drop

- **Drop geometry is pure** in core: `resolveDockTarget(pointer, rect, opts) → { kind: "tab" | "split" | "edge"; edge? }`. Outer ~22% bands of a tabset = split (left/right → vertical, top/bottom → horizontal); center = add as tab; the frame's outer band = dock to a layout side / promote to border. **Hysteresis** at boundaries prevents flicker.
- A **custom dnd-kit collision detector** calls `resolveDockTarget`, composed with `pointerWithin` → `closestCenter` fallbacks.
- **Tab reorder** via `@dnd-kit/sortable` (`horizontalListSortingStrategy`); **`DragOverlay`** renders the ghost in a portal so it is never clipped; `restrictToWindowEdges` keeps it on screen.
- **Indicators** are driven off the live collision result and rendered by the `DockIndicator` slot — `transform` / `opacity` only, `prefers-reduced-motion` honored.
- **Keyboard docking:** dnd-kit `KeyboardSensor` + a custom coordinate-getter cycles dock targets with arrow keys; `aria-live` announces the zone. `dragDockMachine` tracks `via: "pointer" | "keyboard"`.

## 10. Borders

Edge-docked tab drawers on any of the four frame edges. Collapsible (`selected: -1`), optionally auto-hide. Auto-hide is the `borderAutoHideMachine` using `after` delayed transitions for peek/expand/collapse timing. Borders are sized with `Dimension` (fixed px is the common case) via the resize adapter.

## 11. Theming — `@dashfoo/theme`

- A skin **composed from** the headless components (never a fork). Uses **Base UI** (`@base-ui-components/react`) for the interactive bits — overflow menu, context menu, tooltips, rename popover — consistent with the user's `acme` `@repo/ui`. Layout and spacing via **Tailwind v4**.
- **`@dashfoo/theme/tokens.css`** — CSS custom properties: surfaces, borders, tab states, splitter, dock-indicator, radii, shadows, motion. Light / dark via `color-scheme` + token swap. Nested radii (child ≤ parent), layered shadows, **APCA** contrast, contrast bumped on `:hover` / `:focus` / `:active`. Drop it in, or map your own design system onto the same token names.

## 12. Accessibility and interaction

- Tabs follow the WAI-ARIA Tabs pattern (roving tabindex, `aria-selected`, arrow-key navigation).
- `:focus-visible` rings everywhere; focus trap/return for the rename popover; focus moves to a sensible target after close/move.
- Full keyboard docking (above) with `aria-live` announcements.
- Hit targets ≥ 24px (splitter `splitterExtra` widens the grab area); `touch-action: manipulation` on handles.
- `prefers-reduced-motion` honored; only `transform` / `opacity` animate; no `transition: all`.
- No color-only status; tabular numbers where sizes are shown.

## 13. FlexLayout parity checklist

In v1: JSON model (global/layout/borders; row/tabset/tab/border nodes) · splitters + weight & px sizing + min/max · tab drag-reorder (within + across) · tabset move · center + edge + frame-edge docking with indicators · `enableDivide` / `enableEdgeDock` gating · allow-drop veto (`onAction`) · maximize/restore · active-tabset tracking · borders (4 edges, collapsible, auto-hide) · tab overflow menu + wheel scroll + wrap · double-click rename · close buttons · tab location top/bottom · single-tab stretch · render-on-demand · component-state preservation on move · `factory` content resolution · `toJSON`/`fromJSON` + per-tab `config` · Actions/dispatch with interceptable `onAction` + post-commit `onModelChange` · customization hooks (icons, classNames via slots, i18n) · per-node resize/close/visibility events.

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
- Dependencies: `@dashfoo/core` (`workspace:*`), `xstate`, `@xstate/react`.
- Peer dependencies: `react` `^18.3.1 || ^19.0.0`, `react-resizable-panels` (v4, pinned), `@dnd-kit/core` `6.3.1`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`, `@dnd-kit/utilities`.

### `@dashfoo/theme`
ESM-only. `tsdown` build + a published `tokens.css`.
- Exports: `.` (themed components), `./tokens.css`.
- Dependencies: `@base-ui-components/react`, `clsx`, `tailwind-merge`.
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
|---|---|---|
| Layout representation | Serializable model tree (single source of truth) | Trivial `toJSON`/`fromJSON`; controlled state; matches FlexLayout's strength |
| Customization | Headless core + opt-in themeable skin | Directly fixes FlexLayout's un-restructurable chrome — dashfoo's reason to exist |
| State foundation | One XState actor system (document + interactions) | User decision: uniform paradigm, statechart rigor, single inspector, first-class persistence |
| Document mutation | Pure reducer invoked inside the machine | Keep 12 actions testable as a function; machine is the actor shell |
| Validation | zod schemas; `z.infer` for types | One source for schema + types; guards import / action payloads |
| Resize primitive | `react-resizable-panels` **v4**, adapter-isolated | Native px/rem units (needed for px borders/sidebars), SSR/RSC; isolated so downgrade is one file |
| DnD primitive | `dnd-kit` **legacy `@dnd-kit/core` 6.3.1**, adapter-isolated | Stable, React-19-ready, full custom-collision support; isolated for a future `@dnd-kit/react` 1.0 move |
| React support | peer `^18.3.1 || ^19.0.0` | Develop on 19, widen for adoption |
| XState ecosystem | Internal **dependencies** (not peers) | Consumers never touch them; one-line install; peers stay react/rrp/dnd-kit |
| Theme primitives | Base UI (`@base-ui-components/react`) + Tailwind v4 | Consistent with `acme` `@repo/ui`; tokens over class-string swapping |
| Publish | OSS, scoped `@dashfoo/*`, Changesets + provenance | Sits alongside the user's other OSS libs; usebutr pipeline |

## 18. Risks and mitigations

- **All-XState ceremony / contributor ramp.** Mitigation: keep document mutation in a pure reducer the machine invokes; machine definitions are small, pure, and individually tested; the inspector lowers the debugging cost.
- **rrp v4 newness.** Mitigation: adapter isolation; pin an exact version; the swap to battle-tested v2/3 is a one-file change.
- **dnd-kit legacy is feature-frozen.** Mitigation: it is stable and React-19-compatible today; adapter isolation hedges the eventual `@dnd-kit/react` 1.0 move.
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

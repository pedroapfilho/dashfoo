# dashfoo — feature chrome, persistence, and showcase demo

Design doc. Follow-up to `2026-06-02-dashfoo-design.md`. Covers the next arc:
build the remaining interaction chrome, add a persistence layer, retheme the
demo to a fully neutral palette, and rebuild the demo as a multi-page showcase.

## Goals

- Ship the docking features that have model actions but no UI: close, rename,
  maximize, border/edge panels, undo/redo controls.
- Add layout persistence as a reusable `@dashfoo/react` feature on top of the
  existing `serialize.ts` (validated, migratable, pluggable storage).
- Retheme the demo to a fully neutral (grayscale) palette — no hue anywhere,
  including financial data.
- Rebuild the demo as a routed, multi-page showcase where every page is a real,
  interactive dashfoo layout exercising a feature area.

## Non-goals

- Popouts, floating panels, free-grid, sub-layouts (out of scope by prior
  decision).
- `@dashfoo/theme` as a published package — the demo theme stays demo-local;
  extracting it is a later pass.
- Async/remote persistence backends beyond the pluggable adapter seam (the seam
  exists; only sync localStorage/memory adapters ship now).

## Architecture changes by package

- `@dashfoo/core` — no new model concepts (the actions already exist:
  `deleteTab`, `renameTab`, `setMaximizedTabset`, `setActiveTabset`,
  `setBorderSelected`, `adjustBorderSize`, and `border-*` dock locations). Add
  only small pure helpers if a component needs them, with unit tests.
- `@dashfoo/react` — new headless chrome (close/rename/maximize), a `BorderView`
  plus a layout wrapper that arranges borders around the center, maximize-aware
  rendering in `DashfooLayout`, and the persistence hook + storage adapters.
- `apps/demo-vite` — TanStack Router (file-based) + TanStack Query (mock live
  data), neutral theme, six showcase pages, an app shell with sidebar nav.

---

## 1. Persistence

### Why not zustand or the XState snapshot

The project has no zustand (XState-for-everything was deliberate), so its
`persist` middleware would mean a second store. XState's `getPersistedSnapshot`
serializes the whole actor — including the undo/redo history and machine state —
which we do not want to persist. We persist only the document model, which
`serialize.ts` already handles (zod validation + version `migrate`).

### `StorageAdapter`

```ts
type StorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};
```

Ships two implementations:

- `localStorageAdapter` (default) — SSR-safe: if `window`/`localStorage` is
  absent or throws (private mode, quota), reads return `null` and writes are
  caught and `console.warn`-ed (never silent, per project rules).
- `memoryStorageAdapter()` — an in-memory Map, for SSR and tests.

### `usePersistedModel`

```ts
type UsePersistedModelOptions = {
  defaultModel: Dashfoo;
  key: string;
  debounceMs?: number; // default 300
  storage?: StorageAdapter; // default localStorageAdapter
};
type UsePersistedModel = {
  clear: () => void; // wipe storage + reset to defaultModel
  defaultModel: Dashfoo;
  onModelChange: (model: Dashfoo) => void;
};
```

Behavior:

- On first render, load once: `storage.getItem(key)` → `fromJSON` (validates +
  migrates). On hit, that becomes the returned `defaultModel`; on miss or parse
  failure, fall back to the passed `defaultModel` (and clear the bad value).
- `onModelChange` debounce-saves `toJSON(model)` to `storage` (trailing edge,
  `debounceMs`). Flush on unmount so the last change is not lost.
- `clear()` removes the key and returns the model to the original default.

Consumers spread it onto the layout (uncontrolled mode + save-on-change keeps
the actor's undo/redo intact):

```tsx
const persisted = usePersistedModel({ defaultModel: initial, key: "demo:trading" });
<DashfooLayout defaultModel={persisted.defaultModel} onModelChange={persisted.onModelChange} components={...} />
```

### Tests

Unit (Vitest, jsdom): load-hit, load-miss-fallback, corrupt-value fallback +
clear, debounced single save, unmount flush, `clear()` resets, SSR/quota writes
warn and do not throw. `memoryStorageAdapter` drives most cases; a localStorage
case asserts the SSR guard.

---

## 2. Tab close & rename, tabset maximize (headless chrome)

All rendered by `@dashfoo/react` with `data-dashfoo` attributes and **no imposed
CSS** — the consumer's theme styles them. Each is suppressible so a headless
consumer can opt out.

### Close

- A `data-dashfoo="tab-close"` button inside each `TabButton` (after the label),
  `aria-label="Close {name}"`. Click → `deleteTab`, `stopPropagation` so it does
  not also select. Suppressed by `DashfooLayout` prop `closableTabs={false}`.
- Reducer/`normalize` already drop an empty tabset and collapse single-child
  rows, so closing the last tab cleans up the tree.

### Rename

- Double-click a tab label → inline `<input>` seeded with the name; Enter or blur
  commits `renameTab` (trim; empty reverts), Escape cancels. The input traps
  focus while open and restores focus to the tab on close. Local component state
  holds the editing id; no model churn until commit. Suppressed by
  `renamableTabs={false}`.

### Maximize / restore

- A tabset toolbar (`data-dashfoo="tabset-toolbar"`) at the strip's trailing edge
  with a `data-dashfoo="tabset-maximize"` toggle (`aria-pressed`). Click →
  `setMaximizedTabset(id | null)`.
- `DashfooLayout`: when `model.maximizedTabsetId` resolves to a live tabset,
  render only that tabset filling the area (with the toolbar showing a restore
  affordance) instead of the row tree. If the id is stale, ignore it. Suppressed
  by `maximizable={false}`.

### Tests

- Unit: `TabsetView`/`TabButton` render close/rename/maximize affordances and
  dispatch the right actions (RTL + a mock dispatch); rename commit/cancel/empty
  paths; maximize toggles the prop and `DashfooLayout` renders the single tabset.
- e2e: close removes a tab (and an emptied tabset disappears); double-click
  rename changes the label and survives; maximize fills the area and restore
  returns the prior layout.

---

## 3. Borders / edge panels

The model already supports `borders: Array<BorderNode>` (`edge`, `children`,
`selected`, `size`) and `border-*` dock locations; `resolveBorderEdge` exists in
`geometry.ts`. Missing: rendering and the drop seam.

### Rendering

- New `border-view.tsx`: `BorderView` renders one edge's collapsed **strip** of
  tab buttons (vertical text orientation for left/right via `writing-mode`), and,
  when a tab is selected (`selected !== -1`), an expandable **drawer** sized from
  `border.size` (default sensible px). Clicking a strip button toggles
  `setBorderSelected` (toggle to `-1` to collapse). The drawer renders the
  selected border tab's content via the same `renderTab` path as tabsets.
- New `layout-frame.tsx` (or fold into `DashfooLayout`): arrange up to four
  borders around the center `RowView` using CSS grid — `top` / `bottom` rows,
  `left` / `right` columns, center fills. Only edges present in `model.borders`
  render. The drawer's size is resizable via a thin separator that dispatches
  `adjustBorderSize` (reuse the rrp `Separator` styling hook where practical, or
  a lightweight pointer handler — decided at build time, simplest that works).

### Drop seam

- The drag adapter must let a tab dock to a frame edge. Today `intentForTabset`
  resolves tabset-relative zones. Add frame-edge detection: when the pointer is
  within an edge gutter of the **layout frame** (not a tabset), resolve a
  `border-{edge}` intent via `resolveBorderEdge`. The droppable for the frame is
  the `data-dashfoo="layout"` element; `DockIndicator` paints the target edge
  band. The machine already carries `location` through to `moveNode`/`addNode`,
  and the reducer already creates the border on demand.

### Tests

- Unit: `BorderView` renders strip + drawer, toggles selection, dispatches
  `adjustBorderSize`; frame-edge geometry resolves the right `border-*` intent.
- e2e: drag a tab to the window's left edge → it docks as a left border; clicking
  the strip expands/collapses the drawer.

---

## 4. Undo / redo controls

No library change — the store already exposes `undo`, `redo`, `canUndo`,
`canRedo`. The demo renders toolbar buttons (disabled by `canUndo`/`canRedo`) and
binds ⌘Z / ⇧⌘Z (and ⌘Y) with a `useKeyboardShortcuts`-style effect, guarded so it
does not fire while a rename input or other text field is focused.

---

## 5. Neutral theme

Rework `apps/demo-vite/src/index.css` `@theme` to a single neutral ramp (Tailwind
`zinc`-like, hand-tuned for APCA):

- Tokens: `--color-df-bg`, `--color-df-surface`, `--color-df-strip`,
  `--color-df-border`, `--color-df-border-strong`, `--color-df-text`,
  `--color-df-muted`, and a single near-white `--color-df-emphasis` for
  selection/active/focus. No blue/green/red tokens.
- Selection / active / focus: lightness + weight + a 2px `--color-df-emphasis`
  underline; focus rings use `--color-df-emphasis` (or a light gray) at
  `:focus-visible`. Hover/active/focus raise contrast (APCA).
- Data direction: gain/loss render with sign + ▲/▼ glyph + weight in neutral
  tones, never hue. A small helper formats a signed value into
  `{ glyph, text, emphasis }`.
- New chrome (close/rename/maximize/border strips/toolbar) gets `data-dashfoo`
  rules in the same neutral language. Keep the splitter-orientation fix
  (`[data-separator][aria-orientation=...]`).

## 6. Demo: TanStack Router + TanStack Query showcase

### Routing

- `@tanstack/react-router` with file-based routes via `@tanstack/router-plugin`
  (Vite). `routes/__root.tsx` is the app shell; one route file per page. URL
  reflects the page (URL-as-state). Generated `routeTree.gen.ts` is gitignored.
- App shell: a left sidebar nav (links to each page, active state) + a content
  area that hosts the page's dashfoo layout. `<title>` reflects the page.

### Data (TanStack Query)

- A small mock data module simulates a live feed (seeded, deterministic tick via
  an interval-backed `queryFn` + `refetchInterval`). Panels (order book,
  positions, trades, chart series) read through `useQuery`, giving the "LIVE"
  badges real meaning and exercising Query as requested. `QueryClientProvider`
  wraps the app in `__root`.

### Pages

1. **Overview** — the trading terminal, redesigned neutral. The hero; dense,
   realistic, exercises tabsets + splits + drag-dock + resize + live data.
2. **Docking & drag** — a sandbox with several tabs; shows stack / split / reorder
   / insertion-line. A "Reset layout" button (re-seeds the model).
3. **Tabset chrome** — maximize, close, rename, active tabset across a few panels;
   short captions calling out each affordance.
4. **Borders & edges** — a layout with left-nav and bottom-console border panels;
   drag a tab to an edge to dock it.
5. **Persistence** — wired through `usePersistedModel` (its own storage key);
   "your changes survive reload" + a "Clear saved layout" button.
6. **Controlled & history** — controlled mode driven by external state; undo/redo
   buttons + ⌘Z/⇧⌘Z + a live JSON model inspector (read-only, pretty-printed).

Each page owns its seed model in a `models/` module; pages are thin.

## 7. Build order

So the showcase always has something real to render, and dependencies flow
forward:

1. Library chrome — close, rename, maximize (+ maximize-aware `DashfooLayout`).
2. Borders — `BorderView`, frame layout, frame-edge drop seam.
3. Persistence — adapters + `usePersistedModel`.
4. Neutral theme — tokens + `data-dashfoo` rules for old and new chrome.
5. Demo — TanStack Router + Query, app shell, the six pages.
6. Verification — full typecheck/lint/test/build per package; e2e for the new
   interactions; visual pass per page.

## 8. Testing strategy

TDD per the project rules: a failing test precedes each new unit. Unit tests
(Vitest + RTL for components) cover persistence, chrome dispatch/rename/maximize,
border rendering, and frame-edge geometry. e2e (Playwright) covers close, rename,
maximize/restore, border-dock, persistence-survives-reload, and undo/redo. Keep
the existing 9 e2e green; the gutter-regression guard stays.

## 9. Risks / open questions

- **TanStack Router file-based codegen** in this environment — if the plugin's
  generated route tree is fragile under the test/build pipeline, fall back to
  code-based routes (`createRouter` + `createRoute`); same URLs, no codegen.
- **Border drawer resize** — reuse the rrp separator or a small standalone
  pointer handler; pick the simplest that meets the 24px target rule at build.
- **Vertical border strip text** — `writing-mode: vertical-rl` for left/right
  strips; verify hit targets and focus order.
- **Maximize + persistence interaction** — persist `maximizedTabsetId` too (it is
  part of the model); a maximized layout restores maximized. Acceptable.

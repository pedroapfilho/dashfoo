# dashfoo Showcase + Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, batch with checkpoints). Steps use checkbox (`- [ ]`) syntax. TDD throughout — failing test first, watch it fail, minimal impl, watch it pass, commit. Per-package verify gate: `pnpm exec tsc --noEmit && pnpm exec oxlint --fix src && pnpm exec vitest run && pnpm exec tsdown`. Rebuild `@dashfoo/core` then `@dashfoo/react` before the demo (the demo imports dist). Commit unsigned: `git -c commit.gpgsign=false` (1Password signing down).

**Goal:** Build the remaining docking chrome (close/rename/maximize/borders/undo-redo), add a persistence layer, retheme the demo fully neutral, and rebuild it as a TanStack Router + Query multi-page showcase.

**Architecture:** No new core model concepts — the actions and schema flags already exist (`deleteTab`, `renameTab`, `setMaximizedTabset`, `setBorderSelected`, `adjustBorderSize`, `border-*` locations; `enableClose`/`enableMaximize` per tabset). New work is React chrome (headless, `data-dashfoo` attrs, styled by the consumer), a persistence hook on `serialize.ts`, and a redesigned demo.

**Tech Stack:** React 19, XState v5, react-resizable-panels v4, @dnd-kit/react 0.4, zod, Tailwind v4, TanStack Router (file-based) + TanStack Query, Vitest + RTL, Playwright.

---

## File structure

**`@dashfoo/react` (new/modified):**

- `src/tabset-view.tsx` (modify) — add close button, rename input, tabset toolbar + maximize toggle; read suppression flags from context.
- `src/border-view.tsx` (create) — render one border edge: strip of tab buttons + expandable drawer.
- `src/layout-frame.tsx` (create) — arrange borders around the center `RowView`; maximize-aware.
- `src/dashfoo-layout.tsx` (modify) — render `LayoutFrame`; thread suppression flags + `closableTabs`/`renamableTabs`/`maximizable` props into context.
- `src/context.ts` (modify) — add `closableTabs`, `renamableTabs`, `maximizable` to context value.
- `src/persistence.ts` (create) — `StorageAdapter`, `localStorageAdapter`, `memoryStorageAdapter`, `usePersistedModel`.
- `src/drag-adapter.tsx` (modify) — frame-edge drop seam (border-\* intent) + indicator band.
- `src/index.ts` (modify) — export persistence + new types.
- Tests: `persistence.test.ts`, `tabset-view.test.tsx`, `border-view.test.tsx`, plus additions to `dashfoo-layout.test.tsx`.

**`apps/demo-vite` (rebuild):**

- `package.json` — add `@tanstack/react-router`, `@tanstack/react-query`, dev `@tanstack/router-plugin`.
- `vite.config.ts` — add `tanstackRouter()` plugin (before react).
- `src/routes/__root.tsx` — shell: QueryClientProvider + sidebar nav + `<Outlet/>`.
- `src/routes/index.tsx` (Overview), `docking.tsx`, `chrome.tsx`, `borders.tsx`, `persistence.tsx`, `controlled.tsx` — one page each.
- `src/models/*.ts` — seed models per page.
- `src/data/feed.ts` — mock live feed (TanStack Query source).
- `src/components/demo-panel.tsx` — neutral panel content; `src/components/signed-value.tsx` — neutral gain/loss.
- `src/index.css` — neutral `@theme` + `data-dashfoo` rules (old + new chrome).
- `src/main.tsx` — mount the router.
- `e2e/*.spec.ts` — keep `drag-dock.spec.ts`; add `chrome.spec.ts`, `persistence.spec.ts`.

---

## Phase 1 — Tabset chrome: close, rename, maximize

### Task 1.1: Context carries suppression flags

**Files:** Modify `src/context.ts`, `src/dashfoo-layout.tsx`.

- [ ] Add to `DashfooContextValue`: `closableTabs: boolean; maximizable: boolean; renamableTabs: boolean`.
- [ ] In `DashfooLayout`, accept props `closableTabs?`, `renamableTabs?`, `maximizable?` (default `true`), include in the memoized context value (alphabetical keys).
- [ ] Verify: `pnpm exec tsc --noEmit` in `packages/react`. Commit.

### Task 1.2: Close button (TDD)

**Files:** Modify `src/tabset-view.tsx`; test `src/tabset-view.test.tsx` (create).

- [ ] **Failing test** — render a `TabsetView` (wrapped in a context provider + DragProvider stub) with two tabs; assert a `data-dashfoo="tab-close"` button with `aria-label="Close {name}"` exists; click it; assert `dispatch` was called with `{ tabId, type: "deleteTab" }` and that `selectTab` was NOT dispatched. (Use a mock dispatch via a test-only context provider; render with `@testing-library/react`.)
- [ ] Run: `pnpm exec vitest run src/tabset-view.test.ts` → FAIL (no close button).
- [ ] **Implement** — in `TabButton`, after the label, render `closableTabs && tab is closable` → a `<button data-dashfoo="tab-close" aria-label={...} onClick={handleClose}>` where `handleClose` calls `event.stopPropagation()` then `dispatch({ tabId: tab.id, type: "deleteTab" })`. Respect per-tabset `enableClose === false` to suppress.
- [ ] Run test → PASS. Verify gate. Commit.

### Task 1.3: Rename on double-click (TDD)

**Files:** Modify `src/tabset-view.tsx`; test additions.

- [ ] **Failing test** — double-click a tab label → an `<input>` appears seeded with the name; change value + press Enter → `dispatch({ name, tabId, type: "renameTab" })`; Escape cancels (no dispatch); empty/whitespace commit reverts (no dispatch).
- [ ] Run → FAIL.
- [ ] **Implement** — local `editingId` state in `TabsetView` (or a small `useTabRename` hook). Double-click sets editing; render input when `editingId === tab.id`. `handleRenameKeyDown`: Enter → commit (trim; dispatch only if non-empty and changed), Escape → cancel. `handleRenameBlur` commits. Focus the input on mount; restore focus to the tab button on close. Gate on `renamableTabs` + `enableClose`-style flag (reuse `enableClose`? No — rename has no flag; gate only on `renamableTabs`).
- [ ] Run → PASS. Verify gate. Commit.

### Task 1.4: Tabset toolbar + maximize (TDD)

**Files:** Modify `src/tabset-view.tsx`, `src/dashfoo-layout.tsx`/`layout-frame.tsx`; tests.

- [ ] **Failing test (view)** — `TabsetView` renders `data-dashfoo="tabset-toolbar"` with a `data-dashfoo="tabset-maximize"` button (`aria-pressed=false`); click → `dispatch({ tabsetId, type: "setMaximizedTabset" })`. When context says this tabset is maximized, `aria-pressed=true` and the action sends `{ tabsetId: null, ... }` (restore).
- [ ] Run → FAIL.
- [ ] **Implement** — add toolbar to `TabsetView`; `maximizable` + `enableMaximize !== false` gate. The "am I maximized" + restore needs the current `maximizedTabsetId`; pass it via context (add `maximizedTabsetId?: string` to context) or via a prop from the parent. Choose context for simplicity.
- [ ] **Failing test (layout)** — `DashfooLayout` with a model whose `maximizedTabsetId` points to a tabset renders only that tabset (assert the other tabset's tab is absent).
- [ ] Run → FAIL.
- [ ] **Implement** — `LayoutFrame`/`DashfooLayout`: if `maximizedTabsetId` resolves to a live tabset (via `findTabset`), render just `<TabsetView node={thatTabset} />`; else render the row tree. Stale id ignored.
- [ ] Run → PASS. Verify gate. Commit.

### Task 1.5: e2e — chrome

**Files:** `apps/demo-vite/e2e/chrome.spec.ts` (create) — but the demo isn't rebuilt yet; defer the e2e assertions to Phase 5 where pages exist. Placeholder note only. (No code here.)

---

## Phase 2 — Borders / edge panels

### Task 2.1: `BorderView` (TDD)

**Files:** `src/border-view.tsx` (create); `src/border-view.test.tsx` (create).

- [ ] **Failing test** — given a `BorderNode` (edge `left`, two tabs, `selected: -1`), `BorderView` renders a `data-dashfoo="border-strip"` with two `data-dashfoo="border-tab"` buttons and NO drawer; click a button → `dispatch({ edge, index, type: "setBorderSelected" })`. With `selected: 0`, a `data-dashfoo="border-drawer"` renders the selected tab's content; clicking the selected button toggles back to `-1`.
- [ ] Run → FAIL.
- [ ] **Implement** — `BorderView({ node })`: strip of buttons; drawer when `selected !== -1`, content via `renderTab(node.children[selected])`; drawer size from `node.size` (default px constant per edge orientation). `handleSelect(index)` dispatches `setBorderSelected` with toggle. `data-dashfoo` + `data-edge={edge}` for theming.
- [ ] Run → PASS. Verify gate. Commit.

### Task 2.2: `LayoutFrame` arranges borders (TDD)

**Files:** `src/layout-frame.tsx` (create or extend from 1.4); `src/dashfoo-layout.tsx` (modify to use it); tests in `dashfoo-layout.test.tsx`.

- [ ] **Failing test** — `DashfooLayout` with a model having a left border renders `data-dashfoo="border-strip"[data-edge="left"]` and the center `RowView`; with no borders, renders only the center.
- [ ] Run → FAIL.
- [ ] **Implement** — `LayoutFrame`: CSS-grid wrapper placing top/bottom border rows and left/right border columns around the center; render a `BorderView` only for edges present in `model.borders`; maximize short-circuit from 1.4 lives here (maximized → just the tabset, no borders).
- [ ] Run → PASS. Verify gate. Commit.

### Task 2.3: Frame-edge drop seam (TDD)

**Files:** Modify `src/drag-adapter.tsx`; unit test the geometry in `src/dock-geometry.test.ts` (add a `frameEdgeIntent` pure helper to `dock-geometry.ts`).

- [ ] **Failing test (pure)** — add `frameEdgeIntent(rect, point, draggedId)` to `dock-geometry.ts` that returns a `{ location: "border-left", targetId }`-style intent (targetId = a sentinel/frame id) when the pointer is within the edge band of the frame, else `null`. Test left/top/none.
- [ ] Run → FAIL.
- [ ] **Implement** — wrap `resolveBorderEdge`; map edge→`border-{edge}` location. Frame target id can be the layout's own id or a constant; reducer's `insertTab` for `border-*` ignores `targetId` (it finds/creates the border by edge), so any id works — pass `""` or the layout id.
- [ ] **Wire** — register the `data-dashfoo="layout"` element as a droppable (frame). In `handleDragMove`/`handleDragEnd`, if the dnd-kit target is the frame (not a tabset), compute `frameEdgeIntent`; `DockIndicator` paints the edge band (reuse `paneStyle` with an edge-band zone). Keep tabset behavior unchanged when over a tabset.
- [ ] Run unit → PASS. Verify gate. Commit. (Visual/e2e verification in Phase 5/6.)

---

## Phase 3 — Persistence

### Task 3.1: Storage adapters (TDD)

**Files:** `src/persistence.ts` (create); `src/persistence.test.ts` (create).

- [ ] **Failing test** — `memoryStorageAdapter()` round-trips get/set/remove; `localStorageAdapter` get returns `null` when `window` undefined (simulate by temporarily deleting global) and `setItem` swallows+warns on throw (spy on `console.warn`).
- [ ] Run → FAIL.
- [ ] **Implement** — `type StorageAdapter`; `memoryStorageAdapter` (Map-backed); `localStorageAdapter` (guards `typeof window`, try/catch around access, `console.warn` on failure).
- [ ] Run → PASS. Commit.

### Task 3.2: `usePersistedModel` (TDD)

**Files:** `src/persistence.ts` (extend); `src/persistence.test.ts` (extend, uses `@testing-library/react` `renderHook` + fake timers).

- [ ] **Failing test** — with a `memoryStorageAdapter` pre-seeded with a valid `toJSON(modelA)`, `usePersistedModel({ defaultModel: modelB, key, storage })` returns `defaultModel` deep-equal to `modelA` (load hit). With empty storage, returns `modelB`. With corrupt JSON, returns `modelB` and the key is cleared. `onModelChange(modelC)` after `debounceMs` writes `toJSON(modelC)` (advance fake timers); a second change within the window collapses to one write (trailing). `clear()` removes the key and returns to `modelB`.
- [ ] Run → FAIL.
- [ ] **Implement** — lazy `useState` initializer loads once (`fromJSON` in try/catch; on throw, `storage.removeItem(key)` and use `defaultModel`). `onModelChange` = debounced save (ref-held timeout; flush on unmount via `useEffect` cleanup). `clear()` removes + bumps a reset counter that re-seeds `defaultModel`. Return `{ clear, defaultModel, onModelChange }`.
- [ ] Run → PASS. Verify gate. Commit.

### Task 3.3: Export persistence

**Files:** `src/index.ts` (modify).

- [ ] Add `export * from "./persistence";`. Verify gate (`tsdown`). Commit.

---

## Phase 4 — Neutral theme

### Task 4.1: Neutral tokens + chrome rules

**Files:** `apps/demo-vite/src/index.css` (modify). No tests (CSS), but the Phase 5 gutter + chrome e2e guard it.

- [ ] Replace `@theme` with a neutral ramp: `--color-df-bg/surface/strip/border/border-strong/text/muted/emphasis` (grayscale only). Remove `accent/positive/negative`.
- [ ] Update existing `data-dashfoo` rules to use neutral tokens; selection/active/focus use `--color-df-emphasis` (underline + weight). Keep splitter `aria-orientation` fix.
- [ ] Add rules for new chrome: `tab-close`, `tabset-toolbar`, `tabset-maximize`, `border-strip`, `border-tab`, `border-drawer` (+ `[data-edge]` orientation: `writing-mode: vertical-rl` for left/right strips).
- [ ] Visual check via screenshot (Phase 6). Commit.

---

## Phase 5 — Demo: TanStack Router + Query showcase

### Task 5.1: Dependencies + Vite plugin

**Files:** `apps/demo-vite/package.json`, `vite.config.ts`.

- [ ] `pnpm add @tanstack/react-router @tanstack/react-query` and `pnpm add -D @tanstack/router-plugin` (in `apps/demo-vite`). Use Context7 for the exact current setup.
- [ ] `vite.config.ts`: add `tanstackRouter({ target: "react", autoCodeSplitting: true })` before `react()`. Gitignore `src/routeTree.gen.ts`.
- [ ] Verify dev server boots. Commit.

### Task 5.2: Mock feed (TanStack Query)

**Files:** `src/data/feed.ts` (create).

- [ ] Deterministic seeded feed: `useOrderBook()`, `usePositions()`, `useTrades()`, `useChartSeries()` built on `useQuery` with `refetchInterval` and a pure `queryFn` that advances from a seed (no `Math.random`). Commit.

### Task 5.3: Neutral panel components

**Files:** `src/components/signed-value.tsx`, `src/components/demo-panel.tsx` (create).

- [ ] `SignedValue` — formats a number to `{ glyph: ▲/▼/–, text }`, rendered neutral with weight (no color). `DemoPanel` — neutral card content used by tabs. Commit.

### Task 5.4: Root shell + nav

**Files:** `src/routes/__root.tsx`, `src/main.tsx`.

- [ ] `__root`: `QueryClientProvider` + a sidebar `<nav>` with `<Link>`s (active state) + `<Outlet/>`; sets `<title>`. `main.tsx`: create router from generated tree, `<RouterProvider/>`. Commit.

### Task 5.5: Pages (one task each)

**Files:** `src/models/*.ts`, `src/routes/{index,docking,chrome,borders,persistence,controlled}.tsx`.

- [ ] **index (Overview)** — trading terminal seed; tabsets + splits + live data.
- [ ] **docking** — sandbox seed; reset-layout button.
- [ ] **chrome** — panels exercising close/rename/maximize with captions.
- [ ] **borders** — seed with left-nav + bottom-console borders.
- [ ] **persistence** — `usePersistedModel` (key `demo:persistence`) + "Clear saved layout".
- [ ] **controlled** — controlled mode + undo/redo buttons + ⌘Z/⇧⌘Z (guarded against text inputs) + read-only JSON inspector.
- [ ] Commit after each page renders + typechecks.

---

## Phase 6 — Verification

### Task 6.1: e2e for new interactions

**Files:** `e2e/chrome.spec.ts`, `e2e/persistence.spec.ts` (create).

- [ ] chrome: close removes a tab (emptied tabset disappears); rename via double-click persists; maximize fills + restore returns. Target the `chrome` page.
- [ ] persistence: change layout on the persistence page → reload → change survived; "Clear saved layout" resets. (Use a fresh storage state per test.)
- [ ] borders: drag a tab to the window left edge → docks as a left border (on the borders page).
- [ ] Keep `drag-dock.spec.ts` (9) green; the gutter guard stays.

### Task 6.2: Full monorepo gate + visual pass

- [ ] Per package: `tsc --noEmit`, `oxlint --fix src`, `vitest run`, `tsdown`. Rebuild core→react. Run all e2e. Screenshot each page (neutral, gaps, chrome). Commit.

### Task 6.3: Adversarial review (ultracode)

- [ ] Run a review workflow over the diff (correctness, a11y, headless-contract leaks, silent failures, type design). Fix confirmed issues. Commit.

---

## Self-review notes

- **Spec coverage:** persistence (Phase 3), close/rename/maximize (Phase 1), borders (Phase 2), undo/redo (Phase 5 controlled page), neutral theme (Phase 4), routed 6-page demo + Query (Phase 5). All spec sections mapped.
- **Type consistency:** context gains `closableTabs`/`renamableTabs`/`maximizable`/`maximizedTabsetId`; `usePersistedModel` returns `{ clear, defaultModel, onModelChange }`; `StorageAdapter` = `{ getItem, setItem, removeItem }`. Used consistently across tasks.
- **Risk fallback:** if TanStack Router file-based codegen is fragile here, switch to code-based routes (same URLs) — noted in spec §9.

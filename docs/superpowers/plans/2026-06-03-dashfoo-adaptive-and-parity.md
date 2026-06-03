# dashfoo Adaptive + FlexLayout Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, batch with checkpoints). Steps use checkbox (`- [ ]`) syntax. TDD throughout — failing test first, watch it fail, minimal impl, watch it pass, commit. Per-package verify gate: `pnpm exec tsc --noEmit && pnpm exec oxlint --fix src && pnpm exec vitest run && pnpm exec tsdown`. Rebuild `@dashfoo/core` then `@dashfoo/react` before the demo (the demo imports dist). Before any demo e2e: `cd apps/demo-vite && lsof -ti:5174 | xargs kill; rm -f vite.config.js vite.config.d.ts`. Commit unsigned: `git -c commit.gpgsign=false` (1Password signing down).

**Goal:** Add breakpoint-driven adaptive layout and close the four in-scope FlexLayout gaps (inactive-tab keep-alive, tab/header render slots, tab overflow menu, whole-tabset drag).

**Architecture:** Five independently-shippable phases. Core stays framework-free (one pure `stackModel` helper + one `moveTabset` action/reducer path); react adds opt-in props, two render slots, an overflow hook, a responsive hook, and a tabset drag handle. Everything is headless — new controls are `data-dashfoo` elements with only structural inline styles.

**Tech Stack:** React 19, XState v5, react-resizable-panels v4, @dnd-kit/react 0.4 + @dnd-kit/dom, zod, Vitest + RTL, Playwright.

---

## File structure

**`@dashfoo/core`:**

- `src/stack.ts` (create) — `stackModel(model, orientation?)` pure flatten transform.
- `src/reducer.ts` (modify) — extract `placeBesideTarget`; add the `moveTabset` case.
- `src/actions.ts` (modify) — add the `moveTabset` action to `actionSchema`.
- `src/machines/drag-dock-machine.ts` (modify) — emit `moveTabset` for a tabset subject.
- `src/index.ts` (modify) — export `stackModel`.
- Tests: `stack.test.ts`, additions to `docking.test.ts` and `drag-dock-machine.test.ts`.

**`@dashfoo/react`:**

- `src/context.ts` (modify) — add `keepMounted`, `renderTabLabel`, `renderTabsetToolbar`.
- `src/dashfoo-layout.tsx` (modify) — new props → context.
- `src/tabset-view.tsx` (modify) — keep-alive rendering, label/toolbar slots, overflow control.
- `src/tab-overflow.tsx` (create) — `useTabOverflow` + the overflow menu component.
- `src/responsive.ts` (create) — `useResponsiveModel`.
- `src/drag-adapter.tsx` (modify) — `useTabsetDraggable`, tabset subject on START, the grip.
- `src/index.ts` (modify) — export `useResponsiveModel` + types.
- Tests: `keep-alive.test.tsx`, `slots.test.tsx`, `tab-overflow.test.tsx`, `responsive.test.ts`, additions to `imperative.test.tsx`/`chrome.test.tsx`.

**`apps/demo-vite`:**

- `src/pages/responsive.tsx` (create) — a resize-aware page using `useResponsiveModel`.
- `src/router.tsx`, `src/root.tsx` (modify) — add the route + nav link.
- `src/index.css` (modify) — theme the overflow menu, the grip, keep-alive.
- `e2e/overflow.spec.ts`, `e2e/responsive.spec.ts`, `e2e/tabset-drag.spec.ts` (create).

---

## Phase 1 — Inactive-tab keep-alive

### Task 1.1: `keepMounted` renders all panels (TDD)

**Files:** Modify `src/context.ts`, `src/dashfoo-layout.tsx`, `src/tabset-view.tsx`; test `src/keep-alive.test.tsx` (create).

- [ ] **Failing test** — `keep-alive.test.tsx`: render `<DashfooLayout keepMounted components={...} defaultModel={...}/>` where ts1 has Chart+Book. Assert both `CHART` and `BOOK` text are in the document, but the Book panel is `hidden`. Then a control render WITHOUT `keepMounted` asserts `BOOK` is absent.

```tsx
test("keepMounted renders inactive panels (hidden) so their state survives", () => {
  render(<DashfooLayout components={components} defaultModel={model()} keepMounted />);
  expect(screen.getByText("CHART")).toBeVisible();
  const book = screen.getByText("BOOK");
  expect(book).toBeInTheDocument();
  expect(book.closest('[data-dashfoo="tabcontent"]')).not.toBeVisible(); // hidden
});

test("without keepMounted the inactive tab is unmounted", () => {
  render(<DashfooLayout components={components} defaultModel={model()} />);
  expect(screen.queryByText("BOOK")).not.toBeInTheDocument();
});
```

- [ ] Run: `cd packages/react && pnpm exec vitest run src/keep-alive.test.tsx` → FAIL.
- [ ] **Implement** — `context.ts`: add `keepMounted: boolean` to `DashfooContextValue`. `dashfoo-layout.tsx`: add `keepMounted = false` prop, include in `contextValue` + deps. `tabset-view.tsx`: read `keepMounted` from context; replace the single-panel block with:

```tsx
const content =
  keepMounted && node.children.length > 0 ? (
    node.children.map((tab, index) => (
      <div
        aria-labelledby={tabDomId(node.id, tab.id)}
        data-dashfoo="tabcontent"
        hidden={index !== node.selected || undefined}
        id={index === node.selected ? panelDomId(node.id) : undefined}
        key={tab.id}
        role={index === node.selected ? "tabpanel" : undefined}
        style={contentStyle}
        tabIndex={index === node.selected ? 0 : undefined}
      >
        {renderTab(tab)}
      </div>
    ))
  ) : active ? (
    <div
      aria-labelledby={tabDomId(node.id, active.id)}
      data-dashfoo="tabcontent"
      id={panelDomId(node.id)}
      role="tabpanel"
      style={contentStyle}
      tabIndex={0}
    >
      {renderTab(active)}
    </div>
  ) : (
    <div data-dashfoo="tabcontent" style={contentStyle} />
  );
```

- [ ] Run test → PASS. Verify gate (react). Commit: `feat(react): keepMounted — keep inactive tab panels mounted (opt-in)`.

### Task 1.2: e2e — state survives a tab switch

**Files:** `apps/demo-vite` — temporarily flip the chrome page (or a panel) to demonstrate; e2e `e2e/keep-alive.spec.ts` is deferred to the demo wiring in Phase 6. (No code here; covered by the unit test until a demo surface exists.)

---

## Phase 2 — Tab/header render slots

### Task 2.1: `renderTabLabel` (TDD)

**Files:** Modify `src/context.ts`, `src/dashfoo-layout.tsx`, `src/tabset-view.tsx`; test `src/slots.test.tsx` (create).

- [ ] **Failing test** — render with `renderTabLabel={(tab) => <span>{`L:${tab.name}`}</span>}`; assert the tab shows `L:Chart` and the tab's accessible name is still `Chart` (via `aria-label`).

```tsx
test("renderTabLabel customizes the tab label while the accessible name stays the plain name", () => {
  render(
    <DashfooLayout
      components={components}
      defaultModel={model()}
      renderTabLabel={(tab) => <span>{`L:${tab.name}`}</span>}
    />,
  );
  expect(screen.getByText("L:Chart")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
});
```

- [ ] Run → FAIL.
- [ ] **Implement** — `context.ts`: add `renderTabLabel?: (tab: TabNode) => ReactNode`. `dashfoo-layout.tsx`: add the prop, pass to context. `tabset-view.tsx` `TabButton`: accept `renderLabel` (passed from the map via context) and render `{renderLabel ? renderLabel(tab) : tab.name}` inside the button; when `renderLabel` is set, add `aria-label={tab.name}` to the button. Read `renderTabLabel` from context in `TabsetView` and pass to each `TabButton`.
- [ ] Run → PASS. Verify gate. Commit: `feat(react): renderTabLabel slot (tab icons/custom labels)`.

### Task 2.2: `renderTabsetToolbar` (TDD)

**Files:** Modify `src/context.ts`, `src/dashfoo-layout.tsx`, `src/tabset-view.tsx`; test additions to `slots.test.tsx`.

- [ ] **Failing test** — render with `renderTabsetToolbar={(ts) => <button>extra-${ts.id}</button>}`; assert a button `extra-ts1` is in the document.
- [ ] Run → FAIL.
- [ ] **Implement** — `context.ts`: add `renderTabsetToolbar?: (tabset: TabsetNode) => ReactNode`. Thread through `dashfoo-layout.tsx`. In `TabsetView`, render `{renderTabsetToolbar?.(node)}` inside the `data-dashfoo="tabset-toolbar"` div, before the maximize button (always render the toolbar div when either the slot or maximize is present).
- [ ] Run → PASS. Verify gate. Commit: `feat(react): renderTabsetToolbar slot`.

---

## Phase 3 — Tab overflow menu

### Task 3.1: `useTabOverflow` overflow detection (TDD)

**Files:** `src/tab-overflow.tsx` (create); test `src/tab-overflow.test.tsx` (create).

- [ ] **Failing test** — extract a pure helper `overflowingIds(tablist)` that, given an element, returns the ids of `[data-dashfoo="tab"]` children whose right edge exceeds the tablist's client right edge. Test with a stubbed element whose `clientWidth` and children rects are mocked.

```ts
test("overflowingIds returns tabs past the tablist's visible right edge", () => {
  const make = (id: string, right: number) =>
    ({
      dataset: { tabId: id },
      getBoundingClientRect: () => ({ right }),
    }) as unknown as HTMLElement;
  const tablist = {
    getBoundingClientRect: () => ({ right: 100 }),
    querySelectorAll: () => [make("a", 40), make("b", 90), make("c", 140)],
  } as unknown as HTMLElement;
  expect(overflowingIds(tablist)).toEqual(["c"]);
});
```

- [ ] Run → FAIL.
- [ ] **Implement** — `overflowingIds(tablist)`: `const rightEdge = tablist.getBoundingClientRect().right;` map `[...tablist.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')]` filtering `rect.right > rightEdge + 1` → `dataset.tabId`. Add `useTabOverflow(tablistRef)`: state `overflow: string[]`; a `ResizeObserver` + a `recompute` (sets `overflowingIds`); observe the tablist; recompute on mount and resize; return `overflow`.
- [ ] Run → PASS. Commit: `feat(react): useTabOverflow — detect clipped tabs`.

### Task 3.2: overflow menu component (TDD)

**Files:** `src/tab-overflow.tsx` (extend); test additions to `tab-overflow.test.tsx`.

- [ ] **Failing test** — render `<TabOverflowMenu items={[{id:"c",name:"Console"}]} onSelect={spy}/>`; the trigger button (`More tabs`) is present; click opens a `role="menu"`; clicking the `Console` `menuitem` calls `onSelect("c")` and closes; Escape closes.
- [ ] Run → FAIL.
- [ ] **Implement** — `TabOverflowMenu({ items, onSelect })`: `useState(open)`; trigger `<button data-dashfoo="tab-overflow" aria-haspopup="menu" aria-expanded={open} aria-label="More tabs">`; when open, a `<div data-dashfoo="tab-overflow-menu" role="menu">` of `<button data-dashfoo="tab-overflow-item" role="menuitem" onClick={() => { onSelect(id); setOpen(false); }}>`. Close on outside pointerdown (a `useEffect` document listener) and on Escape keydown. Minimal Up/Down focus movement among items.
- [ ] Run → PASS. Verify gate. Commit: `feat(react): tab overflow menu`.

### Task 3.3: wire overflow into TabsetView

**Files:** Modify `src/tabset-view.tsx`.

- [ ] `tablistStyle`: change `overflow: "hidden"` → `overflowX: "auto"` (+ a `scrollbarWidth: "none"` via the demo theme). Call `useTabOverflow(tablistRef)`; when `overflow.length > 0`, render `<TabOverflowMenu items={overflow.map(id → {id,name})} onSelect={(id) => { dispatch(selectTab for id's index); scroll the tab into view; }}/>` in the toolbar row, left of maximize.
- [ ] Verify gate (existing tests still pass — `overflow.length` is 0 in jsdom so the menu does not render). Commit: `feat(react): show an overflow menu when tabs are clipped`.

---

## Phase 4 — Adaptive responsiveness

### Task 4.1: `stackModel` (TDD)

**Files:** `packages/core/src/stack.ts` (create); `src/index.ts` (modify); test `src/stack.test.ts` (create).

- [ ] **Failing test** — a nested model (a row containing a tabset and a column-row of two tabsets) + a left border with one tab → `stackModel(model)` returns a single column row whose children are all four tabsets (three layout + one from the border) in document order, each `weight` equal, tabs/selection preserved, `borders: []`, `maximizedTabsetId` undefined.

```ts
test("stackModel flattens nested rows and borders into one column of tabsets", () => {
  const out = stackModel(nestedModel());
  expect(out.layout.orientation).toBe("column");
  expect(out.layout.children.map((c) => c.type)).toEqual(["tabset", "tabset", "tabset", "tabset"]);
  expect(out.borders).toEqual([]);
  expect(out.maximizedTabsetId).toBeUndefined();
});
```

- [ ] Run: `cd packages/core && pnpm exec vitest run src/stack.test.ts` → FAIL.
- [ ] **Implement** — `stack.ts`: import `collectTabsets` from `./tree`, `normalize` from `./invariants`, types from `./schema`. `stackModel(model, orientation = "column")`: gather `collectTabsets(model)` (layout tabsets in order); for each border, wrap its tabs in a synthetic tabset `{ children: border.children, id: \`border-${border.edge}\`, selected: Math.max(0, border.selected), type: "tabset" }`; concat; map each to `{ ...tabset, weight: 1 }`; build `{ ...model, borders: [], layout: { children, id: model.layout.id, orientation, type: "row" }, maximizedTabsetId: undefined }`; return `normalize(...)`. Export `stackModel`from`index.ts`.
- [ ] Run → PASS. Verify gate (core). Commit: `feat(core): stackModel — flatten any layout into a single column`.

### Task 4.2: `useResponsiveModel` (TDD)

**Files:** `packages/react/src/responsive.ts` (create); `src/index.ts` (modify); test `src/responsive.test.ts` (create, fake `ResizeObserver`/`matchMedia`).

- [ ] **Failing test** — `renderHook(() => useResponsiveModel({ breakpoints: [{ id:"mobile", query:{maxWidth:640}, model: A }, { id:"desktop", model: B }] }))`. With a mocked container width of 500 (via a controllable ResizeObserver mock), `result.current.breakpoint === "mobile"` and `defaultModel === A`; simulate a resize to 1000 → `breakpoint === "desktop"`, `defaultModel === B`, and `key` changed.
- [ ] Run → FAIL.
- [ ] **Implement** — `responsive.ts`:
  - `matchBreakpoint(bp, width)`: no `query` → true; `"maxWidth" in query` → `width <= query.maxWidth`; `"media" in query` → `window.matchMedia(query.media).matches`.
  - hook state `width` (number | undefined) and `containerRef` callback that (dis)connects a `ResizeObserver` writing `entry.contentRect.width`.
  - a `matchMedia` effect: for each `media` breakpoint, add a `change` listener that bumps a `tick` state to force re-evaluation.
  - `active = breakpoints.find((bp) => matchBreakpoint(bp, width ?? Infinity)) ?? breakpoints.at(-1)`.
  - return `{ breakpoint: active.id, containerRef, defaultModel: active.model, key: active.id }`.
- [ ] Run → PASS. Verify gate. Commit: `feat(react): useResponsiveModel — breakpoint-driven model (container or media)`.

### Task 4.3: Responsive demo page

**Files:** `apps/demo-vite/src/pages/responsive.tsx` (create), `src/router.tsx`, `src/root.tsx` (modify).

- [ ] Create the page: `const base = useMemo(() => tradingModel(), [])`; `const r = useResponsiveModel({ breakpoints: [{ id:"mobile", query:{maxWidth:720}, model: stackModel(base) }, { id:"desktop", model: base }] })`; render `<DemoStage title="Responsive" ...><div ref={r.containerRef} className="h-full"><DashfooLayout key={r.key} defaultModel={r.defaultModel} factory={renderPanel} /></div></DemoStage>`. Add the route to `router.tsx` and a nav link to `root.tsx`.
- [ ] Verify the demo typechecks + boots. Commit: `feat(demo): responsive page (stacks under 720px)`.

---

## Phase 5 — Whole-tabset drag

### Task 5.1: `moveTabset` action + reducer (TDD)

**Files:** Modify `packages/core/src/actions.ts`, `src/reducer.ts`; test additions to `docking.test.ts`.

- [ ] **Failing test (center merge)** — `reducer(baseModel(), { location:"center", sourceId:"ts2", targetId:"ts1", type:"moveTabset" })`: ts1 gains ts2's tabs (`["t1","t2","t3"]`), ts2 is gone, the layout has one tabset.
- [ ] **Failing test (split)** — `{ location:"split-right", sourceId:"ts1", targetId:"ts2", type:"moveTabset" }`: ts1 moves beside ts2 keeping its tabs; both tabsets still exist; the emptied original slot collapses.
- [ ] **Failing test (no-op)** — same `sourceId === targetId` returns an unchanged tree.
- [ ] Run: `cd packages/core && pnpm exec vitest run src/docking.test.ts` → FAIL.
- [ ] **Implement** —
  - `actions.ts`: add `z.object({ index: z.number().int().optional(), location: dockLocationSchema, sourceId: z.string(), targetId: z.string(), type: z.literal("moveTabset") })` to `actionSchema`.
  - `reducer.ts`: extract the split branch of `insertTab` into `placeBesideTarget(draft, tabsetNode, targetId, location)` (the existing parent-row-reuse / wrap-in-new-row logic, but taking an existing `tabsetNode` instead of minting one). Have `insertTab`'s split path call it with the freshly-created tabset.
  - Add a helper `removeTabsetReturning(row, id): TabsetNode | undefined` (like `removeTabset` but returns the detached node).
  - `applyAction` `case "moveTabset"`: guard `sourceId === targetId` → return; find the source tabset; if `location === "center"`: append its `children` into the target tabset and `removeTabset(draft.layout, sourceId)`; else detach the source via `removeTabsetReturning` and `placeBesideTarget(draft, source, targetId, location)`. `normalize` (already runs in `reducer`) collapses the emptied row.
- [ ] Run → PASS. Verify gate (core). Commit: `feat(core): moveTabset — move a whole tabset (merge or split)`.

### Task 5.2: machine emits `moveTabset` for a tabset subject (TDD)

**Files:** Modify `packages/core/src/machines/drag-dock-machine.ts`; test additions to `drag-dock-machine.test.ts`.

- [ ] **Failing test** — START with `subject:{ id:"ts1", kind:"tabset" }`, OVER an intent, DROP → the emitted COMMIT action has `type:"moveTabset"` with `sourceId:"ts1"`.
- [ ] Run → FAIL.
- [ ] **Implement** — in the DROP emit, branch: `const type = subject.kind === "tabset" ? "moveTabset" : "moveNode";` and build `{ index: intent.index, location: intent.location, sourceId: subject.id, targetId: intent.targetId, type }`.
- [ ] Run → PASS. Verify gate. Commit: `feat(core): drag machine emits moveTabset for a tabset subject`.

### Task 5.3: tabset drag handle (react)

**Files:** Modify `packages/react/src/drag-adapter.tsx`, `src/tabset-view.tsx`.

- [ ] **Implement** — `drag-adapter.tsx`: add `useTabsetDraggable(id)` = `useDraggable({ data: { type: "tabset" }, id })`. In `handleDragStart`, read `event.operation.source?.data?.type`; send `kind: source.data.type === "tabset" ? "tabset" : "tab"`. Export `useTabsetDraggable`.
- [ ] `tabset-view.tsx`: render a grip in the toolbar (`data-dashfoo="tabset-grip"`, `aria-label="Move tabset"`) wired to `useTabsetDraggable(node.id)`; gate on a new `draggableTabsets` context flag (default true) + `node.enableDrag !== false`. Add `draggableTabsets` to context + `DashfooLayout` prop.
- [ ] Verify gate. Rebuild core→react. Commit: `feat(react): tabset drag handle (grip)`.

### Task 5.4: e2e — tabset drag

**Files:** `apps/demo-vite/e2e/tabset-drag.spec.ts` (create).

- [ ] Drag a tabset grip onto another tabset's center → tabs merge (one fewer tabset). Drag a grip to an edge → splits (tabset moved as a unit). Use the `dragTabTo`-style helper adapted to the grip element.
- [ ] Run e2e. Commit: `test(demo): e2e for whole-tabset drag`.

---

## Phase 6 — Demo wiring, theme, verification

### Task 6.1: theme + demo surfaces

**Files:** `apps/demo-vite/src/index.css`, a demo page or two.

- [ ] Theme the new chrome: `tab-overflow` / `tab-overflow-menu` / `tab-overflow-item` (a dropdown), `tabset-grip` (a drag affordance, `cursor: grab`), and `[data-dashfoo="tabcontent"][hidden]` (already hidden by the attribute). Add `scrollbar-width: none` to the tablist.
- [ ] Wire a demo surface for keep-alive (e.g., the Imperative page or a panel with an input) and the render slots (an icon label on the trading panels). Commit.

### Task 6.2: e2e for overflow + responsive + keep-alive

**Files:** `e2e/overflow.spec.ts`, `e2e/responsive.spec.ts` (create).

- [ ] overflow: shrink a tabset (resize the window or a container) until tabs clip; the overflow button appears; open it; pick a hidden tab; it activates.
- [ ] responsive: set a small viewport; the Responsive page shows the stacked (single-column) model; widen; it restores the desktop model.
- [ ] keep-alive: type into an input on an inactive-capable panel, switch tabs and back, value survives.
- [ ] Run the full e2e suite. Commit.

### Task 6.3: full gate + docs

- [ ] Per package: `tsc --noEmit`, `oxlint --fix src`, `vitest run`, `tsdown`. Rebuild core→react. Full demo e2e. Monorepo `pnpm turbo run typecheck lint test build`.
- [ ] Docs: `docs/guides/responsive.md` (new guide); update `packages/react/README.md` (new props: `keepMounted`, `renderTabLabel`, `renderTabsetToolbar`, `draggableTabsets`; new hook `useResponsiveModel`; new `data-dashfoo` attrs) and `packages/core/README.md` (`stackModel`, `moveTabset`). Commit.

---

## Self-review notes

- **Spec coverage:** keep-alive (Phase 1), render slots (Phase 2), overflow (Phase 3), adaptive `stackModel`+`useResponsiveModel` (Phase 4), whole-tabset drag (Phase 5), demo+theme+docs (Phase 6). All spec sections mapped.
- **Type consistency:** `stackModel(model, orientation?)`; `useResponsiveModel({ breakpoints }) → { breakpoint, containerRef, defaultModel, key }`; `Breakpoint = { id, model, query? }`; `moveTabset` action `{ sourceId, targetId, location, index? }`; context gains `keepMounted`/`renderTabLabel`/`renderTabsetToolbar`/`draggableTabsets`. Used consistently.
- **Headless contract preserved:** new elements are `data-dashfoo` with structural inline styles only; slots return `ReactNode`; the demo theme owns the look.
- **Regression guards:** the `placeBesideTarget` refactor keeps the existing `addNode`/`moveNode` split tests green; keep-alive/overflow default off / inert in jsdom so existing suites are unaffected.

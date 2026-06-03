# dashfoo — adaptive responsiveness + FlexLayout parity

Design doc. The next milestone after the chrome/persistence/showcase arc and the
post-review polish. Five independently-shippable features that close the main
gaps versus FlexLayout (within the tiled-only scope) and add breakpoint-driven
adaptive layout.

## Goals

- **Adaptive responsiveness** — the layout restructures at a breakpoint, keyed off
  the container's width or a media query (consumer's choice), with an opt-in
  auto-stack transform for "mobile from any desktop layout."
- **Tab overflow** — a strip that exceeds its width gets an overflow menu instead
  of clipping unreachable tabs.
- **Inactive-tab keep-alive** — optionally keep non-active tab content mounted so
  scroll/form/chart state survives a tab switch.
- **Tab/header render slots** — let consumers render custom tab labels (icons) and
  a tabset toolbar, headlessly.
- **Whole-tabset drag** — drag an entire tabset (not just a tab) to restack or
  split.

## Non-goals

- Popouts, floating panels, sub-layouts, free-grid (ADR 0001 — unchanged).
- Re-adding a stringly `tab.icon` field (removed in the honesty pass). Icons come
  from the `renderTabLabel` slot instead — a string can't express a React node.
- A bundled menu/positioning library. The overflow menu is dependency-free.
- Cross-breakpoint persistence of user rearrangements (documented tradeoff, not
  built; the consumer can pair persistence keyed per breakpoint).

## Build order

Independent → complex; each phase ships on its own:

1. Inactive-tab keep-alive (smallest, isolated).
2. Tab/header render slots.
3. Tab overflow menu.
4. Adaptive responsiveness (`stackModel` + `useResponsiveModel`).
5. Whole-tabset drag (reducer surgery + a drag handle).

---

## 1. Inactive-tab keep-alive

**Today:** `TabsetView` renders only `renderTab(active)`; inactive tabs unmount and
lose all state.

**Design:** an opt-in `DashfooLayout` prop `keepMounted?: boolean` (default
`false`, preserving current behavior), threaded through context. When `true`,
`TabsetView` renders one panel per tab and hides the inactive ones:

```tsx
node.children.map((tab, index) => (
  <div
    aria-labelledby={tabDomId(node.id, tab.id)}
    data-dashfoo="tabcontent"
    hidden={index !== node.selected}
    id={index === node.selected ? panelDomId(node.id) : undefined}
    key={tab.id}
    role={index === node.selected ? "tabpanel" : undefined}
    tabIndex={index === node.selected ? 0 : undefined}
  >
    {renderTab(tab)}
  </div>
));
```

Only the active panel carries the live `role="tabpanel"` / `id` / `tabIndex`; the
hidden ones use `hidden` (removed from the a11y tree and tab order). Empty tabsets
render a single empty `tabcontent` as before.

**Tests:** unit — with `keepMounted`, switching tabs keeps a non-active panel in
the DOM (assert an inactive panel's marker persists) while only the active is
visible; without it, the inactive unmounts. e2e — type into an input on tab B,
switch to A and back, value survives (only with `keepMounted`).

---

## 2. Tab/header render slots

**Today:** `renderTab(tab)` renders content; the tab label is always `tab.name`
and there is no per-tabset toolbar slot.

**Design:** two optional render props on `DashfooLayout`, threaded through context
alongside `renderTab`:

- `renderTabLabel?: (tab: TabNode) => ReactNode` — rendered inside the tab button
  in place of `{tab.name}`. Defaults to `tab.name`. This is the icon story: a
  consumer maps `tab.config` (or `tab.component`) to `<Icon/> {tab.name}`.
- `renderTabsetToolbar?: (tabset: TabsetNode) => ReactNode` — rendered in the
  tabset toolbar (a `data-dashfoo="tabset-toolbar"` already exists), before the
  maximize button. Lets consumers add per-tabset actions.

Both are pure render functions returning `ReactNode`; the library only positions
them in `data-dashfoo` slots and imposes no styling. The rename editor still
takes over the tab button when editing (the label slot is for the display state).

**Tests:** unit — `renderTabLabel` output appears inside the tab; the tab's
accessible name still resolves (label content provides it, or fall back to an
`aria-label={tab.name}` when a custom label is supplied so the name stays stable);
`renderTabsetToolbar` output appears in the toolbar.

A11y note: when `renderTabLabel` is supplied, set `aria-label={tab.name}` on the
tab button so the accessible name stays the plain name regardless of custom label
content (e.g. an icon-only label).

---

## 3. Tab overflow menu

**Today:** `tablistStyle` is `overflow: hidden`; tabs beyond the width are clipped
and unreachable by pointer.

**Design:** a `useTabOverflow` hook (in `tabset-view.tsx`) observes the tablist
with a `ResizeObserver` and compares each tab's offset against the tablist's
client width to compute the set of overflowing tab ids. When non-empty, render an
overflow control at the strip's trailing edge:

- `data-dashfoo="tab-overflow"` button (`aria-haspopup="menu"`,
  `aria-expanded`), labelled "More tabs". Click toggles the menu.
- `data-dashfoo="tab-overflow-menu"` (`role="menu"`) — a list of the overflowing
  tabs as `data-dashfoo="tab-overflow-item"` (`role="menuitem"`) buttons.
  Selecting one dispatches `selectTab` and scrolls it into view
  (`scrollIntoView`), then closes the menu.
- The menu is dependency-free: an absolutely-positioned element anchored to the
  button, closed on outside-click and Escape, with basic Up/Down/Escape keyboard
  handling (APG menu-button essentials).
- The tablist gains `overflow-x: auto; scrollbar-width: none` so tabs can also be
  reached by scroll/swipe; the menu is the discoverable affordance.

The overflow button sits in the existing toolbar row, left of maximize.

**Tests:** unit — with a stubbed tablist whose `scrollWidth > clientWidth`, the
overflow button renders and its menu lists the hidden tabs; selecting one
dispatches `selectTab`. e2e — shrink a tabset until tabs overflow, open the menu,
pick a hidden tab, it becomes active and visible.

---

## 4. Adaptive responsiveness

Two units. The core helper is framework-free; the hook lives in react.

### `stackModel` (core, pure)

```ts
const stackModel = (model: Dashfoo, orientation?: "row" | "column"): Dashfoo
```

Flattens the layout into a single row of `orientation` (default `column`)
containing every tabset in document order, each with equal weight; tabs,
selection, and tabset ids are preserved. Borders are flattened into the stack as
tabsets appended after the layout's tabsets (so nothing is lost on a narrow
screen), and `borders` becomes `[]`. `maximizedTabsetId` is cleared (stacking and
maximize don't combine). Runs through `normalize` so the result is canonical.
This is the building block for a mobile breakpoint: `stackModel(desktopModel)`.

### `useResponsiveModel` (react)

```ts
type Breakpoint = {
  id: string;
  model: Dashfoo;
  query?: { maxWidth: number } | { media: string }; // omit on the catch-all
};

type UseResponsiveModelOptions = { breakpoints: Array<Breakpoint> };

type ResponsiveModel = {
  breakpoint: string; // active breakpoint id
  containerRef: (el: HTMLElement | null) => void;
  defaultModel: Dashfoo; // the active breakpoint's model
  key: string; // changes when the breakpoint changes (remount)
};
```

- Breakpoints are evaluated top to bottom; the **first match wins**. A `maxWidth`
  query matches when the observed container width `<= maxWidth`; a `media` query
  matches `window.matchMedia(media).matches`; a breakpoint with **no** query
  always matches (the catch-all — placed last, usually the desktop model).
- Width comes from a `ResizeObserver` on the element given to `containerRef`
  (so it tracks the layout's own box, not the viewport); `media` queries use
  `matchMedia` listeners. Both are wired; either kind of breakpoint works, mixed.
- SSR-safe: before measurement, the catch-all (or first no-`maxWidth`) breakpoint
  is active; it settles after mount.
- Usage mirrors `usePersistedModel` (uncontrolled + remount on `key`):

```tsx
const r = useResponsiveModel({
  breakpoints: [
    { id: "mobile", query: { maxWidth: 640 }, model: stackModel(base) },
    { id: "desktop", model: base },
  ],
});
return (
  <div ref={r.containerRef} style={{ height: "100%" }}>
    <DashfooLayout key={r.key} defaultModel={r.defaultModel} factory={...} />
  </div>
);
```

**Tradeoff (documented):** switching breakpoints swaps the model, so per-breakpoint
user rearrangements are not preserved unless the consumer pairs each breakpoint
with `usePersistedModel` under a per-breakpoint key.

**Tests:** unit — `stackModel` flattens nested rows + borders into one column,
preserving tabs/selection (Vitest, pure). `useResponsiveModel` (renderHook + a
mocked `ResizeObserver`/`matchMedia`): picks the first matching breakpoint, falls
to the catch-all, changes `key` on a width crossing. e2e — resize the viewport on
a responsive demo page; the layout switches to the stacked model and back.

---

## 5. Whole-tabset drag

**Today:** only tabs are draggable (`useTabDraggable` on the tab button; the drag
subject `kind` is always `"tab"`). `DragSubject.kind` already includes `"tabset"`.

### Drag handle

A dedicated grip in the tabset toolbar, `data-dashfoo="tabset-grip"`
(`aria-label="Move tabset"`), made draggable via a new `useTabsetDraggable(id)`
that registers a dnd-kit draggable with `data: { type: "tabset" }`. A separate
grip avoids conflicting with tab selection and with the strip being a drop
target. Suppressible via a `draggableTabsets` prop / `enableDrag` on the tabset.

### Drag lifecycle

`handleDragStart` reads the dragged element's `data.type`; for a tabset it sends
`{ subject: { id, kind: "tabset" }, type: "START" }`. The dock-intent resolution
(`resolveIntent`) is unchanged — a tabset drops onto a target tabset's center or
an edge exactly like a tab. On `DROP` the machine emits a `moveTabset` COMMIT when
`subject.kind === "tabset"` (a `moveNode` otherwise).

### Reducer `moveTabset`

```ts
{ type: "moveTabset"; sourceId: string; targetId: string; location: DockLocation; index?: number }
```

- Guard: ignore if `sourceId === targetId`, or if the target is inside the source
  (no-op / invalid).
- **center** — append the source tabset's tabs into the target tabset (merge),
  then remove the now-empty source tabset; `normalize` collapses the source's row
  if it became single-child.
- **split-\*** — detach the source tabset node from its parent row and re-insert it
  beside the target using the existing split placement logic (reuse the parent
  row when orientation matches, else wrap in a new row), preserving the source's
  tabs and weight. This generalizes the current `insertTab` split path to accept
  an existing tabset rather than always minting a new one — refactor
  `insertTab`'s split branch into a shared `placeBesideTarget(tabset, target,
location)` used by both.
- **border-\*** — out of scope for v1 (a whole tabset docking to a border is
  unusual); the grip's frame-edge band can be disabled, or border drops fall back
  to no-op. Decide at build; default: ignore border-\* for tabset subjects.

**Tests:** unit (core) — `moveTabset` center merges tabs and drops the empty
source; split-right places the source beside the target and collapses the source
row; same-id and target-inside-source are no-ops. unit (react) — the machine
emits `moveTabset` for a tabset subject. e2e — drag a tabset grip onto another
tabset (merge) and onto an edge (split); assert the tabset counts/contents.

---

## Cross-cutting

- **Headless contract:** every new control is a `data-dashfoo` element with only
  structural inline styles; the demo theme styles the overflow menu, the grip,
  and the stacked/keep-alive states. New attributes: `tab-overflow`,
  `tab-overflow-menu`, `tab-overflow-item`, `tabset-grip`, plus `data-tab-location`
  (already added). Render slots impose nothing.
- **Demo:** a new "Responsive" page (resize-aware, uses `useResponsiveModel` +
  `stackModel`); the overflow menu, keep-alive, custom tab labels (icons), and
  tabset drag are exercised on the existing pages or a "Parity" page.
- **Docs:** a `docs/guides/responsive.md` guide and updates to the react README
  (new props/hooks) + `the-model` (none — no schema change except possibly a
  `moveTabset` action and an optional tabset `enableDrag`, already present).
- **Schema:** no node-shape changes. New action `moveTabset` in `actions.ts`.
  Keep-alive/slots/overflow are pure react. Adaptive is additive (a core helper +
  a hook).

## Testing strategy

TDD per unit. Core: `stackModel`, `moveTabset` reducer paths (pure, fast).
React: `useResponsiveModel` (mocked observers), overflow geometry, keep-alive
rendering, slot rendering, the machine's tabset-subject COMMIT. e2e: overflow
menu, keep-alive state survival, responsive resize switch, tabset drag merge +
split. Keep the existing suites green.

## Risks

- **Overflow measurement** depends on real layout; unit-test the pure decision
  (given widths) and verify the live ResizeObserver path in e2e.
- **`moveTabset` split refactor** touches the most intricate reducer code
  (`insertTab` split branch). Extract `placeBesideTarget` carefully and keep the
  existing `addNode`/`moveNode` split tests green as the regression guard.
- **Keep-alive performance** — rendering all tabs is opt-in precisely because it
  trades memory for state retention; document it.

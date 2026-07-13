# @dashfoo/react

## 0.6.2

### Patch Changes

- adbaa4b: Bump react-resizable-panels to ^4.12.1

## 0.6.1

### Patch Changes

- bc8a2a5: Stabilize hook identities and fix a key/spread ordering hazard. `useTabDraggable`, `useTabsetDraggable`, `useTabsetDroppable`, and `useResponsiveModel` now return referentially stable objects across re-renders, so consumers can hold the whole result in hook deps without their memoization dissolving. `Tabset.Content` now places the per-tab `key` after the props spread in keepMounted mode, so a spread value can never overwrite React's tab identity.
- 7a22ce3: Update the @xstate/react dependency to v6. No API surface changes — the hooks dashfoo uses (useActorRef, useSelector) are unchanged, and v6 stays peer-compatible with xstate ^5.28 and React 18/19.

## 0.6.0

### Minor Changes

- 5fbe904: Tabsets now register as real dnd-kit `Droppable`s with a custom occlusion-aware collision detector (topmost `elementFromPoint` wins), replacing the hand-rolled tabset registry and per-move hit-test scan. The drop target is resolved by dnd-kit's collision pass, globally across every layer sharing one manager; each drag layer claims only its own targets, so cross-layer drops commit exactly once. Behavior is unchanged: floats still occlude docked tabsets, `editable`/self-drop gates still apply at drag time.
- 5fbe904: Drag-preview chip now rides dnd-kit's Feedback plugin (overlay mode) instead of hand-rolled positioning. The chip element is handed to Feedback's `overlay` accessor at mount, so the source tab is never promoted or placeholder-cloned, per-move positioning happens outside React, and cross-layout drags under one `DashfooDragProvider` show a single chip instead of one per layer. Aborted external drags (invalid `createTab`) now cancel the underlying dnd-kit operation. Drop animation is off — drops settle immediately. The `data-dashfoo="drag-preview"` theme contract is unchanged.

## 0.5.2

### Patch Changes

- 60c6110: Enlarge floating-panel resize hit areas. Edge bands are now 12px (was 6px) and
  straddle the frame border evenly, and corners are 20px (was 14px), so the
  side and bottom edges are far easier to grab with the mouse.

  Fix a resize/move gesture that could lose its pointer on a fast drag and keep
  following the cursor without the button held. A resize now captures the pointer
  up front (so a fast drag never leaks events to the layout beneath), a move with
  no button down ends the gesture, and an OS-cancelled drag reverts instead of
  committing a half-finished rect.

  Fix the drop indicator painting on top of floating panels: a drop aimed at a
  docked tabset now renders behind the float layer (only a float's own indicator
  sits above it).

  Add `title` tooltips to the icon-only chrome buttons (float minimize / dock-back,
  tabset move / maximize / float, tab close, and the tab-overflow menu) so hovering
  reveals what each icon does.

## 0.5.1

### Patch Changes

- aaeaf21: Ship unminified ESM so downstream bundlers (Vite/esbuild dep pre-bundling) process the package correctly; fixes a `ReferenceError: hasSharedManager is not defined` in consumer dev servers. The consuming app minifies once at its own build.
- Updated dependencies [aaeaf21]
  - @dashfoo/core@0.5.1

## 0.5.0

### Minor Changes

- 6ab3d24: Floating panels. A panel can float out of the docked layout into a draggable, resizable overlay and dock back, FlexLayout style — in-app, not a separate window.

  **Core.** Floats are first-class model nodes: `Dashfoo` gains an optional `floats: FloatNode[]`, each owning its own `RowNode` layout subtree, an in-app `geometry`, its own unique `name` ("Panel", "Panel 1", …, assigned when floated; renames are deduped), and an optional `minimized` flag, so floated panels serialize and self-heal like docked ones. New actions — `floatTab`, `floatTabset`, `dockFloat`, `moveFloat`, `setFloatMinimized`, `renameFloat` — plus a `floatNode` builder and tree helpers (`collectRoots`, `findFloat`, `findRootContaining`). Every existing action and `normalize` span all roots (main layout + floats), so a tab can move between a float and the main layout; `normalize` drops a float once its last panel leaves; `dockFloat` restores a float as its own panel (all tabs grouped) by default; and `stackModel` flattens only the main layout (floats pass through, so the compact view never duplicates a floated panel).

  **React.** `DashfooLayout` gains a `floatable` prop that adds a per-tabset float control and renders floating panels; the imperative handle gains `floatTab(tabId)` / `dockFloat(floatId)`. Each float renders in the SAME React tree (no window, no portal) and shares one drag manager with the docked layout, so app context, events, styling, and **dragging tabs into and out of a float** all just work. The viewport-fixed overlay lets a float be dragged anywhere on the page; edge/corner handles resize it (one `moveFloat` per gesture); the window title shows the float's own name and is double-click renamable (`renameFloat`); a minimize control collapses it to a draggable chip (`setFloatMinimized`); and "Dock back" returns it as its own panel. Clicking anywhere in a float raises it above the others, and floats honor the `editable` umbrella — under `editable={false}` a float is static (selectable content and raise-to-front, but no move, resize, rename, minimize, or dock-back). New `Layout.FloatLayer` and `Tabset.FloatButton` for hand-built layouts — `Tabset.FloatButton` hides and warns when no `Layout.FloatLayer` is present.

  **Theme.** Floating-panel chrome for `[data-dashfoo="float"]` — an elevated window frame, a draggable title bar with grip + title, minimize and dock-back controls, resize handles, and the minimized chip — with the float button matching the maximize control.

### Patch Changes

- Updated dependencies [6ab3d24]
  - @dashfoo/core@0.5.0

## 0.4.0

### Minor Changes

- bd4dbda: Configurable magnetic snap points for split resize. Set `snap` on `DashfooLayout` (or `global.snap` in the model, or per-row via a `RowNode`'s `snap`) and the dragged boundary pulls onto a grid while the pointer is within `threshold` percent (default `4`), sticking until it leaves the threshold and committing as a single undo step on release. The grid is the union of `step` (multiples of a fixed percent) and `divisions` (even splits — multiples of `100/d`, where `d` is the number, or `"panels"` to divide by the row's panel count, so a 3-panel row snaps to thirds and a 4-panel row to quarters). The panels glide smoothly onto the snap line (`--dashfoo-snap-transition`, scoped to the snapping group so free-drag tracking stays 1:1 with the pointer) and the active splitter highlights (`data-dashfoo-snapped`, themed by `--dashfoo-snap`) while a snap is engaged — both honor `prefers-reduced-motion`. `{ step: 0 }` on a row opts it out of an inherited default; snapping is locked off in compact mode.

  The engine adds the pure `snapSizes` / `resolveSnapTargets` / `snapEnabled` helpers and a `SnapConfig` (`snapSchema`) on `globalAttributesSchema` and `rowNodeSchema`; built on rrp's continuous `onLayoutChange` + `setLayout`, with `onLayoutChanged` committing the snapped weights.

- 6516f6c: Responsive lock-on-mobile. `DashfooLayout` gains a `responsive={{ maxWidth, orientation? }}` prop: at or below `maxWidth` (measured on the layout's own container) it renders a stacked column and locks tab/tabset drag and split resize, leaving tap-to-switch and maximize. The stacked view is a derived projection of the model — the canonical model is never mutated, so the layout is never remounted and widening back restores the desktop arrangement exactly (undo history, persistence, selection, and mounted panels all survive the breakpoint cross).

  A new `useContainerWidth()` hook (`[ref, width]` via `ResizeObserver`) exposes the same building block for hand-built `Layout.*` layouts, and `Layout.Root` now accepts a `rootRef` to measure its root element.

  Breaking: `useResponsiveModel` no longer returns `defaultModel`/`key` (the old remount-based contract). It now returns `{ breakpoint, containerRef, model, isCompact, draggableTabs, draggableTabsets, resizableSplits }` and `Breakpoint` gains an optional `compact` flag — feed the model and lock flags as reactive props (no `key`, no remount). The pre-existing `key`-remount pattern destroyed store, history, and tab state on every breakpoint cross; this replaces it.

### Patch Changes

- 87206a1: Bump the bundled `@dnd-kit/dom` from `0.4.0` to `^0.5.0`. No API or drag-behavior changes — the drag adapter and the full Playwright drag/dock e2e suite pass unchanged.
- bb86e9a: Fix "Maximum update depth exceeded" crash when a tab move adds or removes a panel.

  The resize `Group` was keyed on the concatenation of its children's ids, so it
  remounted whenever a row's child set changed (e.g. dragging a tab out of a
  tabset, collapsing it). react-resizable-panels force-updates inside its own
  unmount cleanup, and remounting the Group during that commit looped. The Group
  is now keyed on the stable row id and reconciles its panels in place. The
  imperative layout sync also now skips when the panel set changed (the panels'
  `defaultSize` already encodes the weights), avoiding an "Invalid N panel layout"
  error that the in-place reconciliation otherwise surfaced.

- Updated dependencies [c42802b]
- Updated dependencies [bd4dbda]
  - @dashfoo/core@0.4.0

## 0.3.0

### Minor Changes

- 301dcce: The tab-strip drop indicator is a thin insertion line again instead of a tab-shaped ghost, keeping the dock pane's fill and border styling (`--dashfoo-dock-fill` / `--dashfoo-dock-border`). The line is 4px wide, spans the strip height, centers on the slot boundary, and is clamped inside the strip. `--dashfoo-dock-tab-radius` is gone; the new `--dashfoo-dock-line-radius` (default `2px`) rounds the line's ends.
- 1439a72: Static layouts: editing can now be disabled.

  - `@dashfoo/react`: new `editable` prop (default `true`) on `DashfooLayout` and `Layout.Root` — `false` turns off every structural edit at once (tab/tabset drag, close, rename, splitter resize, external drops) while tab selection, maximize, the overflow menu, and the imperative ref API keep working. New granular flags `resizableSplits` and `draggableTabs` (both default `true`); a non-editable layout also rejects drops at the adapter level, so external-source drags under a shared `DashfooDragProvider` can't land in it. Toggleable at runtime without remounting.
  - `@dashfoo/core`: new optional global attributes `enableSplitResize` (backs splitter resizing) and `tabEnableDrag` (tree-wide default behind `tab.enableDrag`).
  - `@dashfoo/theme`: disabled splitters (`[data-separator="disabled"]`) keep their gutter size but lose the grab pill and resize cursor; a tab without a close control gets symmetric padding so the label no longer sits lopsided.

- 301dcce: Add `useDropIntent()`: the live drop intent (`{ targetId, location, index? }` — where the drag would land if dropped right now), or `null` when nothing is dragging or the pointer is over no valid target. `DashfooDragProvider` now also hosts the drag store, so `useDragSubject` and `useDropIntent` work anywhere under the provider (widget lists, custom drop indicators), not just inside the layout.

### Patch Changes

- Updated dependencies [301dcce]
- Updated dependencies [1439a72]
  - @dashfoo/core@0.3.0

## 0.2.0

### Minor Changes

- c0eec7a: The tab-strip drop indicator is now a ghost shaped exactly like the tab it previews instead of a thin insertion line: it takes the dragged tab-item's width, sits in the same vertical box as the target strip's tabs, and shares the split-zone pane's fill and border vars. Its corners read the new `--dashfoo-dock-tab-radius` variable (the shipped theme rounds only the top corners, like its tabs). The indicator now morphs between the ghost and the pane instead of remounting. The `--dashfoo-dock-line` and `--dashfoo-dock-line-radius` CSS variables are gone.
- 7dcc411: External drag sources: drag new tabs into a layout from outside it (a widget list, a palette). `@dashfoo/react` adds `DashfooDragProvider` — sharing one drag manager between a layout and outside sources — and `useExternalTabSource({ createTab, label, disabled })`, which registers any element as a drag source. `@dashfoo/core`'s `dragDockMachine` gains an `external` drag subject that commits the existing `addNode` action on drop, carrying the `TabNode` returned by `createTab` (validated against the tab schema at drag start).
- 70bdb84: Export the full layout as compound primitives. Two new namespaces, same pattern
  as `Panel`: `Layout` (`Root`, `DragLayer`, `Rows` with a `renderTabset` render
  prop, and `Tabset` — the stock composition) and `Tabset` (`Root`, `TabStrip`,
  `Tablist`, `Tab`, `Trigger`, `RenameInput`, `CloseButton`, `Content`,
  `Toolbar`, `OverflowMenu`, `Grip`, `MaximizeButton`). `DashfooLayout` is now a
  thin assembly of these same parts, so a hand-built layout loses nothing —
  selection, close-with-focus-restore, inline rename, keyboard navigation,
  overflow, maximize, and drag-dock all live in the parts.

  Part coordination runs on scoped zustand stores with selector hooks:
  `useLayout(selector)`, `useTabset(selector)`, `useTab()`, and a public
  `useDragSubject()`. Breaking: `DashfooContext`, `useDashfooContext`, and
  `DashfooContextValue` are gone — select from `useLayout` instead. zustand joins
  the bundled dependencies.

  Also fixes drag activation for custom tab labels: the pointer sensor's default
  guard vetoed any pointerdown landing on an element inside the trigger button
  (plain-text labels dodged it; element labels silently lost dragging). The
  sensor is now configured to treat the draggable itself as the handle while
  still refusing genuinely interactive children.

### Patch Changes

- 7dcc411: An external drag source whose `createTab` throws now warns and aborts that drag instead of breaking the drag interaction.
- 7dcc411: Flush pending layout saves on `pagehide` and `visibilitychange` → hidden. A reload or tab close never unmounts React, so a change made inside the debounce window (default 300 ms) used to die with the page — reloading right after a drag silently lost it.
- Updated dependencies [7dcc411]
- Updated dependencies [7dcc411]
- Updated dependencies [7dcc411]
  - @dashfoo/core@0.2.0

## 0.1.0

### Minor Changes

- 7e76a84: Replace the prop-based Panel helper with a compound `Panel.Root`, `Panel.Header`, `Panel.Title`, `Panel.Icon`, `Panel.Badge`, and `Panel.Body` API.
- 7e76a84: Add model and React support for row/tabset min and max sizes, plus a default tabset minimum size.

### Patch Changes

- 7e76a84: dock indicator inline fallbacks now use neutral oklch values
- Updated dependencies [7e76a84]
- Updated dependencies [7e76a84]
  - @dashfoo/core@0.1.0

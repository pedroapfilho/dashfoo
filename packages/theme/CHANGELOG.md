# @dashfoo/theme

## 0.4.0

### Minor Changes

- c4232fc: The skin styles the new `[data-dashfoo="tabset-collapse"]` toolbar button like the other tabset controls.
- 5f14f03: Dashboards can span windows.

  - `onTearOff` on `DashfooLayout` / `Layout.Root` is called when a tab or tabset is released outside the window, with a standalone model of that node, the release point in screen pixels and the source tabset's size. Returning `true` removes it with the new `tearOff` action. The drag preview carries `data-tear-off` while a release would tear off.
  - `dragGroup` lets layouts exchange tabs and tabsets by drag, including layouts portaled into popup windows and layouts in other browser tabs of the same origin. The receiver records the new `transferIn` action and the source `transferOut`. Tab ids must be unique within the group. Mouse drags in a grouped layout use the browser's drag and drop; `dragGroupScope: "app"` keeps a layout's drags within its copy of the app.
  - Core adds `standaloneModel(model, nodeId)` and a `foreign` option on `resolveDropIntent`, so a node from another document that shares a tabset id is not a self-drop.
  - A float's tabsets keep their grips, so dragging one out docks it anywhere. `DashfooHandle` gains `floatTabset` and `setFloatMinimized`.
  - An empty layout still takes drops: docking actions that target an empty main layout's row id seed a tabset there, and `Layout.Rows` renders a `[data-dashfoo="layout-empty"]` drop target.
  - The theme styles the tear-off chip: a dashed border and a "new window" hint.
  - Layouts rendered into another window read that window: `vh`/`vw`/`em` panel sizes, float placement, drop hit testing and the overflow menu's outside click.

## 0.3.0

### Minor Changes

- f501d92: The skin sizes the minimized chip from `--dashfoo-chip-width` and `--dashfoo-chip-height`, the same vars the structural clamp reads, so the chip stays fully on screen. A float you can't edit no longer shows a grab cursor on its title bar. The skin also stops repeating declarations that `@dashfoo/react/styles.css` already sets, so a stale copy can't override a structural change. `DASHFOO_THEME_VERSION` now reports the package version; it was always `"0.0.0"`. The unused `tabset-grip-label` rule is gone.

## 0.2.4

### Patch Changes

- 360e984: Bump runtime dependency ranges to the current non-major line.

## 0.2.3

### Patch Changes

- f22592b: Prepare the early-adopter release: restore persistence after hydration, contain
  storage failures, forward compound refs on React 18 and 19, and correct closable
  tab accessibility. Panel bodies now provide a keyboard scroll target. The core
  parseModel boundary accepts unknown input as documented.

  Refresh examples, API guidance, the landing demo, and the hosted showcase. Add
  standalone package consumers, browser and accessibility gates, and launch assets.

  Improve the light theme’s muted text contrast on tab strips.

  Keep container observation active in React 18 StrictMode and preserve nested panel state across ordinary responsive breakpoint changes.

  Keep restored floats within a narrower viewport without modifying their saved geometry.

## 0.2.2

### Patch Changes

- aaeaf21: Ship unminified ESM so downstream bundlers (Vite/esbuild dep pre-bundling) process the package correctly; fixes a `ReferenceError: hasSharedManager is not defined` in consumer dev servers. The consuming app minifies once at its own build.

## 0.2.1

### Patch Changes

- 1439a72: Static layouts: editing can now be disabled.
  - `@dashfoo/react`: new `editable` prop (default `true`) on `DashfooLayout` and `Layout.Root` — `false` turns off every structural edit at once (tab/tabset drag, close, rename, splitter resize, external drops) while tab selection, maximize, the overflow menu, and the imperative ref API keep working. New granular flags `resizableSplits` and `draggableTabs` (both default `true`); a non-editable layout also rejects drops at the adapter level, so external-source drags under a shared `DashfooDragProvider` can't land in it. Toggleable at runtime without remounting.
  - `@dashfoo/core`: new optional global attributes `enableSplitResize` (backs splitter resizing) and `tabEnableDrag` (tree-wide default behind `tab.enableDrag`).
  - `@dashfoo/theme`: disabled splitters (`[data-separator="disabled"]`) keep their gutter size but lose the grab pill and resize cursor; a tab without a close control gets symmetric padding so the label no longer sits lopsided.

## 0.2.0

### Minor Changes

- 34feaed: Tailwind CSS v4 support via a dual artifact. New `@dashfoo/theme/tailwind.css` export: a Tailwind v4 source entry that puts the tokens in the `theme` layer and the skin in the `components` layer, and bridges the `--dashfoo-*` tokens through `@theme inline` so consumers get `dashfoo-*` utilities (`bg-dashfoo-card`, `text-dashfoo-foreground`, `rounded-dashfoo`, `font-dashfoo`, …) that follow the `data-dashfoo-theme="dark"` remap without `dark:` variants.

  The existing `@dashfoo/theme/dashfoo.css` specifier keeps working and still requires no build step — it now resolves to a prebuilt artifact compiled from the same source at package build time (unlayered, no preflight, byte-equivalent rules; the only drift is a progressive-enhancement `@supports` fallback Lightning CSS adds around the `color-mix()` dock-fill token). `@dashfoo/theme/tokens.css` is unchanged and now resolves to `src/css/tokens.css`.

### Patch Changes

- 7dcc411: Round the top corners of tab items so tabs read as attached to the tabset surface, and introduce a `--dashfoo-radius-sm` token (0.375rem) for nested chrome — tab corners, the tab focus ring, and the overflow/drag chips now resolve through it instead of a hardcoded radius.

## 0.1.0

### Minor Changes

- 7e76a84: Initial release of the default skin: framework-agnostic plain CSS over overridable `--dashfoo-*` tokens (`dashfoo.css` and `tokens.css` entry points), light by default with an opt-in dark variant via `data-dashfoo-theme="dark"`.

### Patch Changes

- 7e76a84: Replace the prop-based Panel helper with a compound `Panel.Root`, `Panel.Header`, `Panel.Title`, `Panel.Icon`, `Panel.Badge`, and `Panel.Body` API.

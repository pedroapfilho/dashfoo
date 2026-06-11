# @dashfoo/react

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

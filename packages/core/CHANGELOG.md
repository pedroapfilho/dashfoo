# @dashfoo/core

## 0.4.0

### Minor Changes

- bd4dbda: Configurable magnetic snap points for split resize. Set `snap` on `DashfooLayout` (or `global.snap` in the model, or per-row via a `RowNode`'s `snap`) and the dragged boundary pulls onto a grid while the pointer is within `threshold` percent (default `4`), sticking until it leaves the threshold and committing as a single undo step on release. The grid is the union of `step` (multiples of a fixed percent) and `divisions` (even splits — multiples of `100/d`, where `d` is the number, or `"panels"` to divide by the row's panel count, so a 3-panel row snaps to thirds and a 4-panel row to quarters). The panels glide smoothly onto the snap line (`--dashfoo-snap-transition`, scoped to the snapping group so free-drag tracking stays 1:1 with the pointer) and the active splitter highlights (`data-dashfoo-snapped`, themed by `--dashfoo-snap`) while a snap is engaged — both honor `prefers-reduced-motion`. `{ step: 0 }` on a row opts it out of an inherited default; snapping is locked off in compact mode.

  The engine adds the pure `snapSizes` / `resolveSnapTargets` / `snapEnabled` helpers and a `SnapConfig` (`snapSchema`) on `globalAttributesSchema` and `rowNodeSchema`; built on rrp's continuous `onLayoutChange` + `setLayout`, with `onLayoutChanged` committing the snapped weights.

### Patch Changes

- c42802b: `moveTabset` center merge now selects the merged-in tab. When a whole tabset is dragged onto another with a center drop, the target's `selected` follows the source's previously-visible tab in the merged array (matching `addNode`/`moveNode` center behavior), so the tab the user was looking at stays visible after the merge instead of jumping to the target's prior selection.

## 0.3.0

### Minor Changes

- 301dcce: Add `dockZonePolygons(rect, opts?)`: enumerates the full hit-region partition behind `resolveDockTarget` as five polygons (inner center rect + four edge trapezoids with diagonal seams). Shares the band default with `resolveDockTarget`, so a painted map always agrees with the live hit-test. New `DockZone` type exported.
- 1439a72: Static layouts: editing can now be disabled.
  - `@dashfoo/react`: new `editable` prop (default `true`) on `DashfooLayout` and `Layout.Root` — `false` turns off every structural edit at once (tab/tabset drag, close, rename, splitter resize, external drops) while tab selection, maximize, the overflow menu, and the imperative ref API keep working. New granular flags `resizableSplits` and `draggableTabs` (both default `true`); a non-editable layout also rejects drops at the adapter level, so external-source drags under a shared `DashfooDragProvider` can't land in it. Toggleable at runtime without remounting.
  - `@dashfoo/core`: new optional global attributes `enableSplitResize` (backs splitter resizing) and `tabEnableDrag` (tree-wide default behind `tab.enableDrag`).
  - `@dashfoo/theme`: disabled splitters (`[data-separator="disabled"]`) keep their gutter size but lose the grab pill and resize cursor; a tab without a close control gets symmetric padding so the label no longer sits lopsided.

## 0.2.0

### Minor Changes

- 7dcc411: External drag sources: drag new tabs into a layout from outside it (a widget list, a palette). `@dashfoo/react` adds `DashfooDragProvider` — sharing one drag manager between a layout and outside sources — and `useExternalTabSource({ createTab, label, disabled })`, which registers any element as a drag source. `@dashfoo/core`'s `dragDockMachine` gains an `external` drag subject that commits the existing `addNode` action on drop, carrying the `TabNode` returned by `createTab` (validated against the tab schema at drag start).
- 7dcc411: Upgrade zod to v4. Schema behavior is unchanged for valid payloads; invalid-payload error messages follow zod 4's wording.

### Patch Changes

- 7dcc411: Bound the undo history to the most recent 100 steps. Every action snapshots the full model; an unbounded `past` grew memory for the life of a session.

## 0.1.0

### Minor Changes

- 7e76a84: Add model and React support for row/tabset min and max sizes, plus a default tabset minimum size.
- 7e76a84: remove the unused migration machinery: `migrate` and `CURRENT_VERSION` are no longer exported, and the model's `version` field is pinned to `1` by the schema (`z.literal(1)`), so payloads in any other format fail validation

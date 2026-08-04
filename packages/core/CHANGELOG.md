# @dashfoo/core

## 1.0.0

### Major Changes

- bf17fd3: Move the model invariants to the parse boundary: `weight` and `floats` are now always present on a parsed model, and `selected` is clamped where it is written.

  `dashfooSchema` still accepts everything it accepted before. What changes is the shape it hands back:

  - `floats` defaults to `[]`, so `Dashfoo.floats` is `FloatNode[]` rather than `FloatNode[] | undefined`. `normalize` no longer maps an emptied list back to `undefined`.
  - `weight` defaults to `1` on rows and tabsets, so `RowNode.weight` and `TabsetNode.weight` are `number`.
  - `tabsetNodeSchema` gained a transform that clamps `selected` into `[0, children.length - 1]`. It is a `ZodPipe` now, not a `ZodObject`, so `.pick()`/`.extend()` on it no longer compile. `tabsetNodeObjectSchema` is exported for that: the same object, before the transform.

  If you construct models with the builders (`model`, `row`, `tabset`) nothing changes: they fill the same defaults, and `tabset()` now clamps the `selected` you pass it.

  If you hold hand-written model literals typed as `Dashfoo`, they will stop compiling, because `weight` and `floats` are required in that type. Two ways out:

  ```ts
  // 1. Parse it. Also gets you validation and the clamps.
  import { parseModel } from "@dashfoo/core";
  import type { DashfooInput } from "@dashfoo/core";

  const stored: DashfooInput = { version: 1, global: {}, layout: { /* no weight needed */ } };
  const model = parseModel(stored);

  // 2. Keep the literal and add what the type now asks for.
  const model: Dashfoo = { version: 1, global: {}, floats: [], layout: { …, weight: 1 } };
  ```

  `DashfooInput` (`z.input<typeof dashfooSchema>`) is the loose input shape, exported so host-supplied or stored data has a type that does not demand the filled-in fields.

  `weight`'s default is `1`, the value every reader already used for a missing weight (`row-view` summed `child.weight ?? 1`). `placeBesideTarget` was the one place that read a missing weight as `100`, which is why docking beside an unweighted target used to halve it to `50` and collapse its unweighted siblings to a sliver of the row. Nothing renders differently: a row whose children all omitted `weight` already split evenly, and every explicit weight is untouched.

  `normalize` keeps the structural work (dropping empty tabsets and rows, collapsing single-child rows, healing `activeTabsetId`/`maximizedTabsetId`) and no longer re-walks the tree clamping `selected`. The actions that can push `selected` out of range clamp the tabset they touch instead: `selectTab`, `deleteTab`, `moveNode`, `floatTab`, `dockFloat`, and a `selected` written through `updateNodeAttributes`. The one behaviour this drops: a hand-written model with an out-of-range `selected`, passed straight to `model`/`defaultModel` without being parsed, is no longer silently repaired at mount.

  Serialized output grows the filled-in fields, so `toJSON` now emits `"floats":[]` and a `"weight"` on every row and tabset. Stored payloads written by an older version still load: the schema fills in what they omit.

  `DashfooMachineInput` is the new name for the XState input type previously exported as `DashfooInput` (`{ model: Dashfoo }`).

  On the React side only fallbacks went away (`store.model.floats ?? []`, four `child.weight ?? 1` reads in `row-view`); no prop or hook signature changed.

### Minor Changes

- 3476369: Add `dockLocationFor(target)` and `splitEdge(location)` to the geometry module, so the structured `DockTarget` is flattened to a `DockLocation` in one place and parsed back in one place instead of being assembled with string concatenation and taken apart with `startsWith`. The serialized `DockLocation` values are unchanged.

  `zoneRect` is now exhaustive over `DockLocation` rather than falling back to the input rect: a caller passing a location outside the enum, which TypeScript already rejects, now gets an error instead of a silent identity result.

### Patch Changes

- 77f8e4a: Collapse the snap-resize state in `RowView` into one discriminated state machine and move the snap policy into `@dashfoo/core`.

  `RowView` tracked a resize gesture across six refs plus a `useState`, one of which existed only to shadow the other. Two callbacks recomputed the snap decision independently with different guard combinations, and combinations like "syncing and snapping at the same time" were representable. The gesture now lives in a single `use-snap-resize` hook holding one `ResizeState` (`idle`, `syncing`, `dragging`, `snapped`); the highlighted boundary is derived from that state rather than stored beside it, and `data-dashfoo-snapping` is rendered as a prop instead of written straight onto the DOM node.

  `@dashfoo/core` gains `decideSnap(sizes, boundaryIndex, config)` and `settleSnap(sizes, boundaryIndex, config)`, which answer "does snapping apply here, and where does the boundary land" next to `snapSizes` and `resolveSnapTargets`. Both are additive; no existing export changed.

- 3476369: Fix `updateNodeAttributes` silently doing nothing. `mutableNodeAttrsSchema` was a union of three fully optional objects, so it always matched on its first member and stripped the keys the other two owned: running an action through `actionSchema` first, which is the documented path for untrusted payloads, turned every tabset and row attribute update into a no-op with `attrs: {}`. It is now one all-optional object holding every mutable key of every node kind, so nothing is stripped at the parse boundary, and the reducer validates the payload against the target node's own schema before writing it, so a tabset attribute can no longer land on a row. `MutableNodeAttrs` only gains optional keys, and the keys the node kinds share declare the same type on both sides, so nothing widened.

## 0.5.2

### Patch Changes

- 469da4c: Carry a collapsing row's `min`, `max` and `snap` onto the child that replaces it in `normalize`. Only `weight` was carried, so a sized container silently lost its constraints on load and the loss was persisted.
- 863fcdf: Collapse the layout-tree queries onto one traversal. `findRow`, `findAttributedNode`, `findTabsetParent`, `collectTabsetsInRow`, `collectIdsInRow` and both tabset removals each carried their own copy of the same recursion; they now share a single `walk`. Public API is unchanged. The copies had drifted in the order they visited a row's own tabsets versus its nested rows, so a layout with duplicate node ids (which the builder and the parser already warn about) can now resolve an id to a different duplicate than before.

## 0.5.1

### Patch Changes

- aaeaf21: Ship unminified ESM so downstream bundlers (Vite/esbuild dep pre-bundling) process the package correctly; fixes a `ReferenceError: hasSharedManager is not defined` in consumer dev servers. The consuming app minifies once at its own build.

## 0.5.0

### Minor Changes

- 6ab3d24: Floating panels. A panel can float out of the docked layout into a draggable, resizable overlay and dock back, FlexLayout style — in-app, not a separate window.

  **Core.** Floats are first-class model nodes: `Dashfoo` gains an optional `floats: FloatNode[]`, each owning its own `RowNode` layout subtree, an in-app `geometry`, its own unique `name` ("Panel", "Panel 1", …, assigned when floated; renames are deduped), and an optional `minimized` flag, so floated panels serialize and self-heal like docked ones. New actions — `floatTab`, `floatTabset`, `dockFloat`, `moveFloat`, `setFloatMinimized`, `renameFloat` — plus a `floatNode` builder and tree helpers (`collectRoots`, `findFloat`, `findRootContaining`). Every existing action and `normalize` span all roots (main layout + floats), so a tab can move between a float and the main layout; `normalize` drops a float once its last panel leaves; `dockFloat` restores a float as its own panel (all tabs grouped) by default; and `stackModel` flattens only the main layout (floats pass through, so the compact view never duplicates a floated panel).

  **React.** `DashfooLayout` gains a `floatable` prop that adds a per-tabset float control and renders floating panels; the imperative handle gains `floatTab(tabId)` / `dockFloat(floatId)`. Each float renders in the SAME React tree (no window, no portal) and shares one drag manager with the docked layout, so app context, events, styling, and **dragging tabs into and out of a float** all just work. The viewport-fixed overlay lets a float be dragged anywhere on the page; edge/corner handles resize it (one `moveFloat` per gesture); the window title shows the float's own name and is double-click renamable (`renameFloat`); a minimize control collapses it to a draggable chip (`setFloatMinimized`); and "Dock back" returns it as its own panel. Clicking anywhere in a float raises it above the others, and floats honor the `editable` umbrella — under `editable={false}` a float is static (selectable content and raise-to-front, but no move, resize, rename, minimize, or dock-back). New `Layout.FloatLayer` and `Tabset.FloatButton` for hand-built layouts — `Tabset.FloatButton` hides and warns when no `Layout.FloatLayer` is present.

  **Theme.** Floating-panel chrome for `[data-dashfoo="float"]` — an elevated window frame, a draggable title bar with grip + title, minimize and dock-back controls, resize handles, and the minimized chip — with the float button matching the maximize control.

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

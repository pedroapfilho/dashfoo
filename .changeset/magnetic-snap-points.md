---
"@dashfoo/core": minor
"@dashfoo/react": minor
---

Configurable magnetic snap points for split resize. Set `snap` on `DashfooLayout` (or `global.snap` in the model, or per-row via a `RowNode`'s `snap`) and the dragged boundary pulls onto a grid while the pointer is within `threshold` percent (default `4`), sticking until it leaves the threshold and committing as a single undo step on release. The grid is the union of `step` (multiples of a fixed percent) and `divisions` (even splits — multiples of `100/d`, where `d` is the number, or `"panels"` to divide by the row's panel count, so a 3-panel row snaps to thirds and a 4-panel row to quarters). The panels glide smoothly onto the snap line (`--dashfoo-snap-transition`, scoped to the snapping group so free-drag tracking stays 1:1 with the pointer) and the active splitter highlights (`data-dashfoo-snapped`, themed by `--dashfoo-snap`) while a snap is engaged — both honor `prefers-reduced-motion`. `{ step: 0 }` on a row opts it out of an inherited default; snapping is locked off in compact mode.

The engine adds the pure `snapSizes` / `resolveSnapTargets` / `snapEnabled` helpers and a `SnapConfig` (`snapSchema`) on `globalAttributesSchema` and `rowNodeSchema`; built on rrp's continuous `onLayoutChange` + `setLayout`, with `onLayoutChanged` committing the snapped weights.

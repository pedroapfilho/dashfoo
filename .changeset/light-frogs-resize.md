---
"@dashfoo/core": patch
"@dashfoo/react": patch
---

Collapse the snap-resize state in `RowView` into one discriminated state machine and move the snap policy into `@dashfoo/core`.

`RowView` tracked a resize gesture across six refs plus a `useState`, one of which existed only to shadow the other. Two callbacks recomputed the snap decision independently with different guard combinations, and combinations like "syncing and snapping at the same time" were representable. The gesture now lives in a single `use-snap-resize` hook holding one `ResizeState` (`idle`, `syncing`, `dragging`, `snapped`); the highlighted boundary is derived from that state rather than stored beside it, and `data-dashfoo-snapping` is rendered as a prop instead of written straight onto the DOM node.

`@dashfoo/core` gains `decideSnap(sizes, boundaryIndex, config)` and `settleSnap(sizes, boundaryIndex, config)`, which answer "does snapping apply here, and where does the boundary land" next to `snapSizes` and `resolveSnapTargets`. Both are additive; no existing export changed.

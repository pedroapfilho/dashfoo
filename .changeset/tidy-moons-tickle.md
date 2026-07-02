---
"@dashfoo/react": minor
---

Drag-preview chip now rides dnd-kit's Feedback plugin (overlay mode) instead of hand-rolled positioning. The chip element is handed to Feedback's `overlay` accessor at mount, so the source tab is never promoted or placeholder-cloned, per-move positioning happens outside React, and cross-layout drags under one `DashfooDragProvider` show a single chip instead of one per layer. Aborted external drags (invalid `createTab`) now cancel the underlying dnd-kit operation. Drop animation is off — drops settle immediately. The `data-dashfoo="drag-preview"` theme contract is unchanged.

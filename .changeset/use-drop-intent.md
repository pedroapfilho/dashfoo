---
"@dashfoo/react": minor
---

Add `useDropIntent()`: the live drop intent (`{ targetId, location, index? }` — where the drag would land if dropped right now), or `null` when nothing is dragging or the pointer is over no valid target. `DashfooDragProvider` now also hosts the drag store, so `useDragSubject` and `useDropIntent` work anywhere under the provider (widget lists, custom drop indicators), not just inside the layout.

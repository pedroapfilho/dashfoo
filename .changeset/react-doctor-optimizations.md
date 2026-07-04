---
"@dashfoo/react": patch
---

Stabilize hook identities and fix a key/spread ordering hazard. `useTabDraggable`, `useTabsetDraggable`, `useTabsetDroppable`, and `useResponsiveModel` now return referentially stable objects across re-renders, so consumers can hold the whole result in hook deps without their memoization dissolving. `Tabset.Content` now places the per-tab `key` after the props spread in keepMounted mode, so a spread value can never overwrite React's tab identity.

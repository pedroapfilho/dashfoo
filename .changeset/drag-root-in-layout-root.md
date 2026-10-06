---
"@dashfoo/react": minor
---

`Layout.Root` now mounts the drag root, so every layout gets exactly one drag manager and drag actor, shared by the main tree and its floats. Hand-built layouts with `Layout.FloatLayer` can now drag between floats and the main tree; before, each float mounted its own root and those drops failed silently. A root nested inside another (a layout under `DashfooDragProvider`, or a layout in a tab) reuses the outer one. `Layout.DragLayer` no longer mounts a root of its own: it must sit inside a `Layout.Root`, warns when it does not, and drops its undocumented `onCommit` and `splitDock` props in favour of the layout store.

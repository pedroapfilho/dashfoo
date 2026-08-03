---
"@dashfoo/react": patch
---

`undo()` and `redo()` now warn once when the layout is controlled through the `model` prop, instead of returning in silence. `canUndo()` and `canRedo()` keep reporting `false` in that mode, and `dispatch` now runs through the same internal actor whether the layout is controlled or not.

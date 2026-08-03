---
"@dashfoo/react": patch
---

`undo()` and `redo()` now warn once when the layout is controlled through the `model` prop, instead of returning in silence. `canUndo()` and `canRedo()` keep reporting `false` in that mode.

`dispatch` now runs through the same internal actor whether or not the layout is controlled. In controlled mode it therefore derives the next model from the actor's present document, which every new `model` prop syncs into, rather than from the prop directly. A consumer that feeds `onModelChange` back into `model` sees no difference; one that ignores `onModelChange` now sees successive dispatches compound instead of each starting from the unchanged prop.

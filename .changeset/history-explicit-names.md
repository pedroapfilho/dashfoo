---
"@dashfoo/core": major
---

Give the history functions explicit names: `dispatch` is now `dispatchToHistory`, `undo` is `undoHistory`, `redo` is `redoHistory`, `canUndo` is `canUndoHistory` and `canRedo` is `canRedoHistory`. `createHistory` now normalizes the model it receives, so every history holds a canonical document.

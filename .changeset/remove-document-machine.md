---
"@dashfoo/core": major
---

Remove `dashfooMachine`. It had one state and mapped each event onto a history function, so it added indirection without a lifecycle. Hold a `History` from `createHistory` and step it with `dispatchToHistory`, `undoHistory` and `redoHistory`. `dragDockMachine` is unchanged.

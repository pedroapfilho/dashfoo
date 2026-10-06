---
"@dashfoo/core": patch
---

The reducer detects a no-op once, by comparing the normalized result with its input, and returns the input object when they match. Maximizing a float's tabset or an unknown id, and re-sending an identical `min`, `max`, `snap` or `config`, no longer record an undo step or clear the redo stack.

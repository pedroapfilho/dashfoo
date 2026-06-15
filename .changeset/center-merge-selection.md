---
"@dashfoo/core": patch
---

`moveTabset` center merge now selects the merged-in tab. When a whole tabset is dragged onto another with a center drop, the target's `selected` follows the source's previously-visible tab in the merged array (matching `addNode`/`moveNode` center behavior), so the tab the user was looking at stays visible after the merge instead of jumping to the target's prior selection.

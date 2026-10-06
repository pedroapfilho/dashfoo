---
"@dashfoo/core": major
---

Remove exports nothing consumed: `findRootContaining`, the `TabContainer` alias (`TabLocation.container` is a `TabsetNode`), and the snap internals `snapSizes`, `resolveSnapTargets`, `DEFAULT_SNAP_THRESHOLD` and `SnapResult`. Snap through `resolveSnapGrid`, `decideSnap` and `settleSnap`.

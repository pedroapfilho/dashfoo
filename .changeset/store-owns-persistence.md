---
"@dashfoo/react": minor
---

`useDashfooStore` now owns the whole document lifecycle. It takes a `persist` option (the same `string | { key, storage?, debounceMs? }` that `DashfooLayout` accepts) that loads once after hydration, restores without an undo entry or a save, debounce-saves every change and flushes on page hide and unmount. The store also returns `reset()`, which clears the saved copy and restores `defaultModel`. Hand-built layouts get the same persistence as `DashfooLayout` from the hook alone.

Breaking: `usePersistence` and its `Persistence` and `PersistConfig` types are removed; pass `persist` to `useDashfooStore` instead. The persist input type is exported as `PersistInput`. With `persist` set, `setModel` now saves the replacement like any other change. The store no longer runs an XState actor.

---
"@dashfoo/react": patch
---

Handle the tab keyboard model on `Tabset.Trigger`, the `role="tab"` button, instead of the `Tabset.Tablist` scroll viewport. Arrow keys, Home and End behave as before; to intercept them, pass `onKeyDown` to `Tabset.Trigger` and call `preventDefault()`.

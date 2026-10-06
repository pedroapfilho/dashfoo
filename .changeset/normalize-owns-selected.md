---
"@dashfoo/core": major
---

`normalize` clamps every tabset's `selected` into its strip. `tabsetNodeSchema` now checks shape only, so `tabsetNodeSchema.parse` and `dashfooSchema.parse` keep an out-of-range `selected` for `normalize` (and `parseModel`) to clamp. `tabsetNodeObjectSchema` is removed: `tabsetNodeSchema` has no transform left to bypass.

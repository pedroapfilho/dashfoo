---
"@dashfoo/react": patch
---

A collapsed tabset is sized by its own tab strip. With `tabLocation: "bottom"` and a layout nested in one of its tabs, the nested layout's strip was measured instead.

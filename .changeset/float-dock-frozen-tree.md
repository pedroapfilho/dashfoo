---
"@dashfoo/react": patch
---

A float's dock button now follows `restructurable`. With `restructurable: false`, or in the compact responsive view, the button stayed live and docked the float into a tree that was meant to be frozen, with no way to float it again. It is now shown only when the layout can dock (`editable && restructurable`).

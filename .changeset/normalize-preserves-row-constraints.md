---
"@dashfoo/core": patch
---

Carry a collapsing row's `min`, `max` and `snap` onto the child that replaces it in `normalize`. Only `weight` was carried, so a sized container silently lost its constraints on load and the loss was persisted.

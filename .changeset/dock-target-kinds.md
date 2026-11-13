---
"@dashfoo/core": patch
---

A drop into an empty layout creates its first tabset when it lands. Docking used to seed one while looking the target up and rely on `normalize` to remove it when the drop failed. No behaviour changes.

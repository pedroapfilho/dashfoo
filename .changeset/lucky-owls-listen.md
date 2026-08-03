---
"@dashfoo/core": patch
---

`updateNodeAttributes` no longer writes one node kind's attributes onto another. The reducer now validates the payload against the target node's own schema (tab, tabset or row) and drops keys that belong to a different kind, so a wrong-kind write is rejected instead of applied. Note that `actionSchema` still strips `attrs` for this action, because `mutableNodeAttrsSchema` is a union of fully optional objects; dispatch it from typed code until that union is rebuilt as a discriminated union.

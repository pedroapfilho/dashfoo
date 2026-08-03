---
"@dashfoo/core": patch
---

Fix `updateNodeAttributes` silently doing nothing. `mutableNodeAttrsSchema` was a union of three fully optional objects, so it always matched on its first member and stripped the keys the other two owned: running an action through `actionSchema` first, which is the documented path for untrusted payloads, turned every tabset and row attribute update into a no-op with `attrs: {}`. It is now one all-optional object holding every mutable key of every node kind, so nothing is stripped at the parse boundary, and the reducer validates the payload against the target node's own schema before writing it, so a tabset attribute can no longer land on a row. `MutableNodeAttrs` only gains optional keys, and the keys the node kinds share declare the same type on both sides, so nothing widened.

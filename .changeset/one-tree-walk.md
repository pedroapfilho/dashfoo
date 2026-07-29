---
"@dashfoo/core": patch
---

Collapse the layout-tree queries onto one traversal. `findRow`, `findAttributedNode`, `findTabsetParent`, `collectTabsetsInRow`, `collectIdsInRow` and both tabset removals each carried their own copy of the same recursion; they now share a single `walk`. Public API is unchanged. The copies had drifted in the order they visited a row's own tabsets versus its nested rows, so a layout with duplicate node ids (which the builder and the parser already warn about) can now resolve an id to a different duplicate than before.

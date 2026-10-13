---
"@dashfoo/core": patch
---

Every docking action now activates the tabset that received the moved content. `moveNode`, `moveTabset` and `addNode` onto a tabset's center used to leave focus where it was, so merging the active tabset away dropped focus to the first tabset. `addNode` with a tab id already in the layout is ignored with a `[dashfoo]` warning instead of creating a duplicate.

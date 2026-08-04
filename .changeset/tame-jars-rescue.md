---
"@dashfoo/react": minor
---

`Layout.Root` takes a `restructurable` prop. When it is `false` the tree is frozen (no tab or tabset dragging, no splitter resizing, no floating) while tabs stay closable and renamable, which is what compact responsive mode needs. `DashfooLayout` uses it instead of overriding four capability props one by one, and it no longer discards an explicitly dispatched `adjustSplit` while compact. `Layout.FloatLayer`'s `global` prop is now optional and unused: floating panels inherit their capabilities from the layout above them.

---
"@dashfoo/core": minor
"@dashfoo/react": patch
---

Removing a tab from a strip keeps the selection on the tab that was selected; removing a tab before it used to shift the selection onto its neighbour. Core exports the rule as `fallbackSelectedIndex`, and the tab strip's drag preview uses it instead of its own copy.

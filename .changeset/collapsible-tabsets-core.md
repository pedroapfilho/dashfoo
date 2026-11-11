---
"@dashfoo/core": major
---

Collapsible tabsets and a choice of which tab takes over when the selected one leaves.

- Tabsets take `collapsible` and `collapsed`. The new `setTabsetCollapsed` action (`{ tabsetId, collapsed }`) collapses a collapsible tabset to its strip or expands it, and its `weight` stays the share it expands back to. Selecting a tab expands its tabset. A row always keeps one expanded child: the action won't collapse the last one, `normalize` expands a row left with only collapsed children, and `canCollapseTabset(parent, tabset)` answers the same question for renderers. `collapsible` is a mutable tabset attribute, and the builders take both flags.
- `global.tabSetSelectOnRemove` picks the heir when the selected tab is closed or dragged out: `"neighbor"` (default, as before) or `"recent"`, the tab selected before it. Under `"recent"`, `normalize` keeps each tabset's `selectionHistory` (tab ids, most recent first) in the model.

Breaking: `fallbackSelectedIndex(count, removedIndex)` is now `fallbackSelectedIndex(tabset, removedIndex, policy?)`.

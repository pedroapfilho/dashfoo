---
"@dashfoo/react": patch
---

Fix "Maximum update depth exceeded" crash when a tab move adds or removes a panel.

The resize `Group` was keyed on the concatenation of its children's ids, so it
remounted whenever a row's child set changed (e.g. dragging a tab out of a
tabset, collapsing it). react-resizable-panels force-updates inside its own
unmount cleanup, and remounting the Group during that commit looped. The Group
is now keyed on the stable row id and reconciles its panels in place. The
imperative layout sync also now skips when the panel set changed (the panels'
`defaultSize` already encodes the weights), avoiding an "Invalid N panel layout"
error that the in-place reconciliation otherwise surfaced.

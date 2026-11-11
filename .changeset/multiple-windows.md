---
"@dashfoo/core": minor
"@dashfoo/react": minor
"@dashfoo/theme": minor
---

Dashboards can span windows.

- `onTearOff` on `DashfooLayout` / `Layout.Root` is called when a tab or tabset is released outside the window, with a standalone model of that node, the release point in screen pixels and the source tabset's size. Returning `true` removes it with the new `tearOff` action. The drag preview carries `data-tear-off` while a release would tear off.
- `dragGroup` lets layouts exchange tabs and tabsets by drag, including layouts portaled into popup windows and layouts in other browser tabs of the same origin. The receiver records the new `transferIn` action and the source `transferOut`. Tab ids must be unique within the group. Mouse drags in a grouped layout use the browser's drag and drop; `dragGroupScope: "app"` keeps a layout's drags within its copy of the app.
- Core adds `standaloneModel(model, nodeId)` and a `foreign` option on `resolveDropIntent`, so a node from another document that shares a tabset id is not a self-drop.
- A float's tabsets keep their grips, so dragging one out docks it anywhere. `DashfooHandle` gains `floatTabset` and `setFloatMinimized`.
- An empty layout still takes drops: docking actions that target an empty main layout's row id seed a tabset there, and `Layout.Rows` renders a `[data-dashfoo="layout-empty"]` drop target.
- The theme styles the tear-off chip: a dashed border and a "new window" hint.
- Layouts rendered into another window read that window: `vh`/`vw`/`em` panel sizes, float placement, drop hit testing and the overflow menu's outside click.

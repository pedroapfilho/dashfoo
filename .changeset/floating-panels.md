---
"@dashfoo/core": minor
"@dashfoo/react": minor
---

Floating panels. A panel can float out of the docked layout into a draggable, resizable overlay and dock back, FlexLayout style — in-app, not a separate window.

**Core.** Floats are first-class model nodes: `Dashfoo` gains an optional `floats: FloatNode[]`, each owning its own `RowNode` layout subtree and an in-app `geometry`, so floated panels serialize and self-heal like docked ones. New actions — `floatTab`, `floatTabset`, `dockFloat`, `moveFloat` — plus a `floatNode` builder and tree helpers (`collectRoots`, `findFloat`, `findRootContaining`). Every existing action and `normalize` now span all roots (main layout + floats), `normalize` drops a float once its last panel leaves, and `stackModel` flattens only the main layout (floats pass through, so the compact view never duplicates a floated panel).

**React.** `DashfooLayout` gains a `floatable` prop that adds a per-tabset float control and renders floating panels; the imperative handle gains `floatTab(tabId)` / `dockFloat(floatId)`. Each float renders in the SAME React tree (no window, no portal), so app context, events, and styling apply with nothing extra; the title bar drags it, edge/corner handles resize it (one `moveFloat` per gesture), and a "Dock back" control returns it. New `Layout.FloatLayer` and `Tabset.FloatButton` for hand-built layouts — `Tabset.FloatButton` hides and warns when no `Layout.FloatLayer` is present. Drag-a-tab-out-to-redock is out of scope for now (dock-back only).

**Theme.** Floating-panel chrome for `[data-dashfoo="float"]`, its title bar, dock-back control, and resize handles, with the float button matching the maximize control.

---
"@dashfoo/core": minor
"@dashfoo/react": minor
---

Floating panels. A panel can float out of the docked layout into a draggable, resizable overlay and dock back, FlexLayout style — in-app, not a separate window.

**Core.** Floats are first-class model nodes: `Dashfoo` gains an optional `floats: FloatNode[]`, each owning its own `RowNode` layout subtree, an in-app `geometry`, its own unique `name` ("Panel", "Panel 1", …, assigned when floated; renames are deduped), and an optional `minimized` flag, so floated panels serialize and self-heal like docked ones. New actions — `floatTab`, `floatTabset`, `dockFloat`, `moveFloat`, `setFloatMinimized`, `renameFloat` — plus a `floatNode` builder and tree helpers (`collectRoots`, `findFloat`, `findRootContaining`). Every existing action and `normalize` span all roots (main layout + floats), so a tab can move between a float and the main layout; `normalize` drops a float once its last panel leaves; `dockFloat` restores a float as its own panel (all tabs grouped) by default; and `stackModel` flattens only the main layout (floats pass through, so the compact view never duplicates a floated panel).

**React.** `DashfooLayout` gains a `floatable` prop that adds a per-tabset float control and renders floating panels; the imperative handle gains `floatTab(tabId)` / `dockFloat(floatId)`. Each float renders in the SAME React tree (no window, no portal) and shares one drag manager with the docked layout, so app context, events, styling, and **dragging tabs into and out of a float** all just work. The viewport-fixed overlay lets a float be dragged anywhere on the page; edge/corner handles resize it (one `moveFloat` per gesture); the window title shows the float's own name and is double-click renamable (`renameFloat`); a minimize control collapses it to a draggable chip (`setFloatMinimized`); and "Dock back" returns it as its own panel. New `Layout.FloatLayer` and `Tabset.FloatButton` for hand-built layouts — `Tabset.FloatButton` hides and warns when no `Layout.FloatLayer` is present.

**Theme.** Floating-panel chrome for `[data-dashfoo="float"]` — an elevated window frame, a draggable title bar with grip + title, minimize and dock-back controls, resize handles, and the minimized chip — with the float button matching the maximize control.

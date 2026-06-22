---
"@dashfoo/core": minor
"@dashfoo/react": minor
---

Detached windows. A panel can pop out into its own browser window and dock back, VS Code style.

**Core.** Windows are first-class model nodes: `Dashfoo` gains an optional `windows: WindowNode[]`, each owning its own `RowNode` layout subtree and on-screen `geometry`, so popped-out panels serialize and self-heal like docked ones. New actions — `detachTab`, `detachTabset`, `reattachWindow`, `updateWindowGeometry` — plus a `windowNode` builder and tree helpers (`collectRoots`, `findWindow`, `findRootContaining`). Every existing action and `normalize` now span all roots (main layout + windows), and `normalize` drops a window once its last panel leaves.

**React.** `DashfooLayout` gains a `poppable` prop that adds a per-tabset pop-out control and renders detached windows; the imperative handle gains `detachTab(tabId)` / `reattachWindow(windowId)`. Each popup gets its own React root (not a cross-document portal, so clicks/keyboard work) and the host stylesheets are copied across (dashfoo stays headless). New `Layout.PopoutLayer` + `Layout.Windows` and `Tabset.PopoutButton` for hand-built layouts. Drag-dock inside a popup is intentionally out of scope for now (a panel there is select/close/rename plus a "Dock back" control); on reload, persisted windows collapse back into the main layout rather than fighting the popup blocker.

**Theme.** Window-chrome styling for `[data-dashfoo="window"]`, its toolbar, and the dock-back button, with the pop-out button matching the maximize control.

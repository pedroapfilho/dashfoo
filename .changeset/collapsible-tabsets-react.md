---
"@dashfoo/react": minor
---

Collapsible tabsets, and button parts that render from their state.

- `Tabset.CollapseButton` collapses a `collapsible` tabset to its strip or expands it, with `aria-expanded` and `aria-controls`. The default toolbar includes it. Dragging a splitter past the tabset's minimum also collapses it, and clicking one of its tabs expands it. `DashfooHandle` adds `collapseTabset` and `expandTabset`. Collapsed tabsets carry `data-collapsed` (`"column"`, or `"row"` side by side, where `styles.css` turns the strip vertical).
- When a split is too small for its minimums (a layout saved on a bigger screen, or a shrinking window), its collapsible tabsets are collapsed to fit without changing the model, and expand again once there is room. They carry `data-collapsed-to-fit`, and `useTabset` reports `isCollapsedToFit`, so their expand button stays hidden.
- `Tabset.MaximizeButton` renders nothing for the only tabset in the layout.
- `children`, `className`, `style` and `title` on `Tabset.CloseButton`, `Tabset.Grip`, `Tabset.CollapseButton` and `Tabset.MaximizeButton` can be functions of the part's state, e.g. `{({ isCollapsed }) => (isCollapsed ? "▸" : "▾")}`.
- `useTabset` adds `isCollapsed`, `isCollapsedToFit`, `canCollapse` and `toggleCollapsed`. The drag preview follows `global.tabSetSelectOnRemove`.

---
"@dashfoo/react": minor
---

Export the full layout as compound primitives. Two new namespaces, same pattern
as `Panel`: `Layout` (`Root`, `DragLayer`, `Rows` with a `renderTabset` render
prop, and `Tabset` — the stock composition) and `Tabset` (`Root`, `TabStrip`,
`Tablist`, `Tab`, `Trigger`, `RenameInput`, `CloseButton`, `Content`,
`Toolbar`, `OverflowMenu`, `Grip`, `MaximizeButton`). `DashfooLayout` is now a
thin assembly of these same parts, so a hand-built layout loses nothing —
selection, close-with-focus-restore, inline rename, keyboard navigation,
overflow, maximize, and drag-dock all live in the parts.

Part coordination runs on scoped zustand stores with selector hooks:
`useLayout(selector)`, `useTabset(selector)`, `useTab()`, and a public
`useDragSubject()`. Breaking: `DashfooContext`, `useDashfooContext`, and
`DashfooContextValue` are gone — select from `useLayout` instead. zustand joins
the bundled dependencies.

Also fixes drag activation for custom tab labels: the pointer sensor's default
guard vetoed any pointerdown landing on an element inside the trigger button
(plain-text labels dodged it; element labels silently lost dragging). The
sensor is now configured to treat the draggable itself as the handle while
still refusing genuinely interactive children.

---
"@dashfoo/react": minor
---

Responsive lock-on-mobile. `DashfooLayout` gains a `responsive={{ maxWidth, orientation? }}` prop: at or below `maxWidth` (measured on the layout's own container) it renders a stacked column and locks tab/tabset drag and split resize, leaving tap-to-switch and maximize. The stacked view is a derived projection of the model — the canonical model is never mutated, so the layout is never remounted and widening back restores the desktop arrangement exactly (undo history, persistence, selection, and mounted panels all survive the breakpoint cross).

A new `useContainerWidth()` hook (`[ref, width]` via `ResizeObserver`) exposes the same building block for hand-built `Layout.*` layouts, and `Layout.Root` now accepts a `rootRef` to measure its root element.

Breaking: `useResponsiveModel` no longer returns `defaultModel`/`key` (the old remount-based contract). It now returns `{ breakpoint, containerRef, model, isCompact, draggableTabs, draggableTabsets, resizableSplits }` and `Breakpoint` gains an optional `compact` flag — feed the model and lock flags as reactive props (no `key`, no remount). The pre-existing `key`-remount pattern destroyed store, history, and tab state on every breakpoint cross; this replaces it.

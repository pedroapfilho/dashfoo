---
"@dashfoo/core": minor
"@dashfoo/react": minor
---

Drag and drop catches up with the react-resizable-panels Workspace (4.17 to 4.20).

- A whole tabset drags by the empty space in its header as well as its grip. The drag preview shows the extra tab count, like `Canvas (+2)`.
- Tabsets take an `enableDrag` flag. A tabset with it off, or holding a tab with it off, can't be dragged whole.
- Tabs and tabsets dock at the layout's edges, beside everything else, as a sidebar or bottom panel. It's on by default; turn it off with `edgeDocking={false}`. In the model, an edge dock is a `split-*` against the root row: `addNode`, `moveNode` and `moveTabset` accept `model.layout.id` as `targetId`. `resolveDropIntent` and `dropIndicator` take `edges` (a `MeasuredLayout`), and `DropIndicator.kind` gains `"edge"`.
- The dock indicator is one element for the whole drag, rendered by the drag root, so it can slide between tabsets. Off any target it stays put with `data-idle` and fades out. Inside a float it carries `data-floating`. The default `--dashfoo-dock-transition` adds `opacity 60ms`.
- Right-to-left layouts: the insertion index and line count from the right, left and right drops land on the screen side you dropped on, and ArrowLeft moves to the next tab. `MeasuredTabset` carries `direction`, and `measureTabset` reads it.
- Moving the pointer within the same drop target no longer re-renders anything; only a different target updates the indicator and the drop hooks.
- A tab or tabset turned undraggable while on screen (say `enableDrag` set to `false` after load) no longer still drags from its handle.

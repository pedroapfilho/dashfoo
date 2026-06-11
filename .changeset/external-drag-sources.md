---
"@dashfoo/react": minor
"@dashfoo/core": minor
---

External drag sources: drag new tabs into a layout from outside it (a widget list, a palette). `@dashfoo/react` adds `DashfooDragProvider` — sharing one drag manager between a layout and outside sources — and `useExternalTabSource({ createTab, label, disabled })`, which registers any element as a drag source. `@dashfoo/core`'s `dragDockMachine` gains an `external` drag subject that commits the existing `addNode` action on drop, carrying the `TabNode` returned by `createTab` (validated against the tab schema at drag start).

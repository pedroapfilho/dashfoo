# @dashfoo/core

## 0.2.0

### Minor Changes

- 7dcc411: External drag sources: drag new tabs into a layout from outside it (a widget list, a palette). `@dashfoo/react` adds `DashfooDragProvider` — sharing one drag manager between a layout and outside sources — and `useExternalTabSource({ createTab, label, disabled })`, which registers any element as a drag source. `@dashfoo/core`'s `dragDockMachine` gains an `external` drag subject that commits the existing `addNode` action on drop, carrying the `TabNode` returned by `createTab` (validated against the tab schema at drag start).
- 7dcc411: Upgrade zod to v4. Schema behavior is unchanged for valid payloads; invalid-payload error messages follow zod 4's wording.

### Patch Changes

- 7dcc411: Bound the undo history to the most recent 100 steps. Every action snapshots the full model; an unbounded `past` grew memory for the life of a session.

## 0.1.0

### Minor Changes

- 7e76a84: Add model and React support for row/tabset min and max sizes, plus a default tabset minimum size.
- 7e76a84: remove the unused migration machinery: `migrate` and `CURRENT_VERSION` are no longer exported, and the model's `version` field is pinned to `1` by the schema (`z.literal(1)`), so payloads in any other format fail validation

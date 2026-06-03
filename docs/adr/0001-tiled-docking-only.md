# ADR 0001 — Tiled docking only; no popouts, floating panels, sub-layouts, or free grid

## Status

Accepted · 2026-06-02

## Context

dashfoo exists because FlexLayout has the right model and the wrong chrome. Its
serializable layout tree (rows of tabsets, a `toJSON` /
`fromJSON` round-trip) is exactly what a dashboard library needs. Its appearance
is baked in: the chrome cannot be restructured, only re-skinned at the edges.
dashfoo keeps the model and throws out the fixed chrome. What remains is a
headless engine plus an opt-in themeable skin.

FlexLayout also ships a wider surface than the model alone. It can pop a tabset
into a native browser window, and other libraries in the space (react-grid-layout,
gridstack) offer a free 2D coordinate canvas. The early scoping question was which
of those capabilities dashfoo v1 takes on.

The answer landed at: everything FlexLayout does **except popouts**, and, on
inspection, except the other escapes from the tiled tree too. Popout drags in
cross-document portals, ResizeObservers bound to the wrong window, background-timer
throttling, and reload-while-maximized edge cases. It is a caveat-heavy capability
almost nobody needs. Once popout is out, in-document floating panels, nested
sub-layouts, and a free grid are the same kind of departure from a single tiled
tree, each with its own invariant-breaking cost.

## Decision

**dashfoo v1 models exactly one thing: a single tiled docking tree.**

A layout is a tree of rows, tabsets, and tabs. The `Dashfoo` model in
`packages/core/src/schema.ts` encodes precisely this and nothing wider:

```ts
type Dashfoo = {
  version: number;
  global: GlobalAttributes;
  layout: RowNode; // root is always a row
  activeTabsetId?: string;
  maximizedTabsetId?: string;
};
```

The shape of the tree is fixed by the node schemas:

- `RowNode` has an explicit `orientation: "row" | "column"` and children that are
  only `RowNode | TabsetNode`. A row holds rows and tabsets, never a tab directly
  and never a floating coordinate.
- `TabsetNode` children are `TabNode[]` with a `selected` index. A tabset is a
  stack of tabs, sized by `weight` within its parent row (with optional `min` /
  `max` / `size` `Dimension` constraints). It has no `x` / `y` / `z` position.
- `TabNode` carries a `component` registry key and serializable `config`, never a
  React element and never a nested layout.

There is no node type for a floating panel, a popout window, a sub-document, or a
grid cell. The serializable tree is the entire contract, and it is one tiled tree.

The four capabilities that fall outside it are non-goals for v1:

1. **Popout into native browser windows.** The model has no concept of a node
   living in another document.
2. **In-document floating panels.** A tabset cannot detach and float over the
   layout. Every tabset is a leaf of the row tree.
3. **Nested sub-layouts.** A `TabNode` resolves to one registered component, not
   to another `Dashfoo`. There is no recursion through tab content.
4. **Free 2D grid.** Sizing is `weight` ratios and unit-typed `Dimension`
   constraints inside a split tree, not absolute `x` / `y` / `w` / `h` on a
   coordinate canvas.

## Consequences

- The pure reducer's self-healing invariants stay tractable. Empty tabsets are
  removed, single-child rows collapse, `selected` indices are clamped, and
  `maximizedTabsetId` is cleared when its tabset disappears. Each invariant is
  defined over one tree. A second coordinate space (floating, grid, or a child
  document) would multiply the invariant surface and the cases every action has to
  re-canonicalize.
- `resolveDockTarget` has a closed set of outcomes: center (stack as tab) and the
  four `split-*` edges, matching the `DockLocation` union exactly. No drop can land
  "between" tiles or at a free coordinate, so the geometry stays a pure, unit-tested
  function.
- `toJSON` / `fromJSON` stay trivial and lossless. There is no live window handle,
  no DOM rect, and no element reference to serialize around, only the tree and
  registry keys.
- dashfoo will not be the right tool for a freeform widget canvas. A consumer who
  needs absolute-positioned, overlapping, drag-anywhere widgets should reach for
  react-grid-layout or gridstack. dashfoo is a split/tab tree, not a coordinate
  surface, and this ADR is the record of that boundary.
- The escape hatches remain addable later behind the same model and the same
  XState actor system. Adding a node type and the actions to produce it is an
  additive change to the schema and reducer, not a rewrite of the engine. This
  ADR scopes v1; it does not foreclose v2.

## Alternatives considered

1. **FlexLayout-style popout to a native window.** Rejected. It pulls in
   cross-document portals, ResizeObservers bound to the main window, background-timer
   throttling, and reload-while-maximized edge cases, a high caveat density for a
   capability the target users rarely ask for. Keeping every node in one document
   keeps the model serializable without window handles.
2. **In-document floating / detachable panels.** Rejected for v1. A floating layer
   over the tiled tree is a second positioning system with its own z-order,
   collision, and persistence rules. It doubles the invariant work in the reducer
   for a feature orthogonal to the docking story.
3. **Nested sub-layouts (a full dashfoo inside a tab).** Rejected for v1. Recursive
   documents complicate undo / redo scope, action routing, and the single-source-of-
   truth guarantee, with no clear v1 use case. A `TabNode` stays a leaf that resolves
   to one registered component.
4. **Free 2D grid (react-grid-layout / gridstack absolute x/y/w/h).** Rejected as a
   category mismatch. dashfoo is a split/tab tree sized by `weight` and unit-typed
   `Dimension`, not a coordinate canvas. The two models do not compose into one
   coherent engine, and trying to serve both would dilute the tiled docking that is
   dashfoo's reason to exist.

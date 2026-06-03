# ADR 0003 — structuredClone over Immer for the reducer

## Status

Accepted · 2026-06-02

## Context

The `@dashfoo/core` engine is a pure reducer: `(model: Dashfoo, action:
Action) => Dashfoo`. It must never mutate its input, since the React layer
holds the previous model and relies on identity comparison to decide what
re-renders.

The model is a recursive tree. `RowNode.children` is an array of `RowNode |
TabsetNode`, so a row can nest rows to arbitrary depth:

```ts
type RowNode = {
  children: Array<RowNode | TabsetNode>;
  id: string;
  orientation: Orientation;
  type: "row";
  weight?: number;
};
```

Most actions edit this tree by reference — find a node, splice a child, set
a `weight`, reassign `selected`. Writing that against a frozen immutable
structure with hand-rolled spreads is verbose and error-prone, because each
edit has to rebuild every ancestor up to the root. Immer is the usual answer:
mutate a draft, get an immutable result back.

Immer's `produce` types the draft as `Draft<T>`. On a recursive type like
`RowNode`, `Draft<>` recurses through `children` into itself, and the
TypeScript compiler hits `TS2589: Type instantiation is excessively deep and
possibly infinite`. Suppressing it would mean `@ts-expect-error` on the hot
path of the engine, or casting the draft, which defeats the point of running
the reducer under strict mode with zero type errors.

## Decision

**The reducer deep-copies with `structuredClone`, mutates the copy, then
normalizes.**

The whole engine is three lines:

```ts
const reducer = (model: Dashfoo, action: Action): Dashfoo => {
  const draft = structuredClone(model);
  applyAction(draft, action);
  return normalize(draft);
};
```

1. `structuredClone(model)` produces a fully detached copy. The input is
   never touched, so callers keep their old reference intact.
2. `applyAction(draft, action)` mutates the copy directly with plain
   imperative code — `splice`, `Object.assign`, index assignment. No spreads,
   no ancestor rebuilding, no draft proxy.
3. `normalize(draft)` runs the self-healing invariants (drop empty
   tabsets and rows, collapse redundant single-child rows, clamp `selected`
   indices, repoint stale `activeTabsetId` / `maximizedTabsetId`) and returns
   the canonical result.

`structuredClone` is a built-in in every runtime we target (Node 18+, all
modern browsers). It needs no dependency, no import, and no build-time
configuration.

It also matches the schema's own constraint. The model is validated against
`dashfooSchema`, and per-tab `config` is restricted to `JsonValue`
specifically so the model stays losslessly serializable. A model that
`structuredClone` cannot copy (a function, a symbol, a class instance) is the
same model that would fail serialization, so the clone boundary and the
schema boundary agree.

## Consequences

- **A full clone runs on every action.** At dashfoo's tree size — a layout is
  a handful of tabsets and a few dozen tabs — cloning the model is sub-
  millisecond and never on a per-frame path. Drag previews and splitter
  drags are handled in the React adapters; the reducer only fires on
  committed actions (drop, resize end, select, rename, close). The clone cost
  is irrelevant at this scale.
- **`applyAction` is plain imperative code.** Helpers like `insertTab`,
  `removeTabset`, and the `applyAction` switch mutate `draft` in place. They
  read straightforwardly because they are not fighting an immutability layer.
  The purity guarantee lives in one place — the `structuredClone` call — not
  smeared across every helper.
- **No structural sharing.** Immer returns the same reference for unchanged
  subtrees; `structuredClone` returns all-new references. The React layer
  does not depend on subtree identity (it keys off node `id`), so this costs
  nothing today. If a future profiling pass shows wasted re-renders from
  changed identities, memoize at the component boundary rather than
  reintroduce a drafting library.
- **One dependency avoided.** `@dashfoo/core` stays at zod plus xstate. No
  Immer in the bundle, no Immer in the type graph, no `TS2589`.

## Alternatives considered

1. **Immer `produce`.** The intended fit for mutate-style reducers over
   immutable state. Rejected: `Draft<RowNode>` recurses into itself and
   triggers `TS2589` under strict mode. The workarounds (cast the draft,
   suppress the error) trade a type hole for ergonomics on the engine's hot
   path.
2. **Hand-rolled immutable spreads.** No dependency and structural sharing
   for free. Rejected: every edit on the recursive tree has to rebuild each
   ancestor by hand, which is exactly the verbose, bug-prone code Immer
   exists to remove. The `normalize` pass already rebuilds the tree with
   spreads where canonicalization needs it; forcing that style on every
   mutation in `applyAction` would bury the logic.
3. **Mutate the input directly (no clone).** The cheapest option. Rejected:
   it breaks the pure-reducer contract the React layer is built on, and would
   let one action's edit leak into a caller still holding the previous model.

# ADR 0002 — XState v5 for state, not zustand

## Status

Accepted · 2026-06-02

## Context

dashfoo needs three things from its state layer that a plain store doesn't give for free:

1. **Undo/redo over the document.** Every mutation must be reversible, and adjacent
   tweaks of the same kind (a resize drag) must coalesce into one history entry
   rather than flooding the past stack.
2. **Validated transitions.** A drag interaction has a real lifecycle. Nothing is
   dragging, then a tab is dragging, then it either drops somewhere valid or it
   cancels. A drop only makes sense once a subject and a drop target both exist.
   That's a state machine, and modelling it as loose booleans (`isDragging`,
   `dragSubject`, `dropIntent`) invites the impossible states (a drop with no
   subject) that crash docking layouts.
3. **A clean separation between the document and the interaction.** The document is
   data with full history. The drag is transient pointer state that touches the
   document exactly once, at commit. Folding both into one bag of mutable fields
   blurs which writes belong in the undo stack and which don't.

zustand is the obvious default for a React library this size. The question was
whether its plain-store-plus-middleware model carries its weight here, or whether
the lifecycle and the document split push us toward an actor model instead.

## Decision

**Use XState v5 (`^5.0.0`, already a `@dashfoo/core` dependency) as the state
layer. Model the system as two actors.**

### The document machine — `dashfooMachine`

Defined in `packages/core/src/machines/dashfoo-machine.ts`. It owns the undo/redo
history whose `present` is the live model, and it runs the pure reducer through the
history helpers (`dispatch`, `undo`, `redo` from `history.ts`). It has a single
finite state, `ready` — the document is data, not a lifecycle — so every change is
an event handled with `assign`:

```ts
type DashfooEvent =
  | { action: Action; type: "DISPATCH" }
  | { model: Dashfoo; type: "SET_MODEL" }
  | { type: "REDO" }
  | { type: "UNDO" };
```

`DISPATCH` runs `dispatch(context.history, event.action)`, which calls the reducer
and pushes a (possibly coalesced) history entry. `UNDO`/`REDO` walk the history.
`SET_MODEL` replaces the document wholesale via `createHistory(event.model)`, the
hook a controlled host uses to push a new model in.

The reducer itself stays pure and lives outside the machine. It clones with
`structuredClone` and returns the next `Dashfoo`. The machine's only job is to hold
the history and decide which helper an event maps to. Keeping the reducer pure means
it's testable with no actor involved, and the machine stays small enough to read in
one screen.

### The interaction machine — `dragDockMachine`

Defined in `packages/core/src/machines/drag-dock-machine.ts`. This one is a real
lifecycle: `idle → dragging → (drop | cancel) → idle`.

```ts
states: {
  idle: {
    entry: assign({ intent: null, subject: null }),
    on: { START: { /* set subject */ target: "dragging" } },
  },
  dragging: {
    on: {
      OVER: { /* assign intent */ },
      CANCEL: { target: "idle" },
      DROP: [ /* guarded commit, else plain return */ ],
    },
  },
}
```

It owns transient drag state only, a `subject` (the tab or tabset being dragged)
and an `intent` (target id, dock location, optional index). It never touches the
document. On a valid `DROP` it runs the `hasValidDrop` guard, and only then **emits**
a `COMMIT` event carrying a `moveNode` action:

```ts
type DragEmitted = { action: Action; type: "COMMIT" };
```

The React layer listens for that emitted `COMMIT` and forwards its `action` to
`dashfooMachine` as a `DISPATCH`. The guard plus the `requireDrop` invariant
(which throws if `subject` or `intent` is null at commit time) make the impossible
drop unrepresentable rather than a runtime surprise.

This is the payoff of the two-actor split. A drag produces dozens of `OVER` events
and zero document writes; only the final commit lands in the undo stack as one
`moveNode`. The boundary between "transient" and "durable" is the boundary between
the two machines, not a convention someone has to remember.

### Binding to React

`packages/react/src/store.ts` binds a `dashfooMachine` actor with `useActorRef`
and reads its history with `useSelector` from `@xstate/react`. The same hook covers
both control modes: uncontrolled (`defaultModel`) lets the actor own the document
with full undo/redo; controlled (`model`) makes the prop the source of truth, routes
every change through `onModelChange`, and keeps the actor synced via `SET_MODEL` so
an inspector still sees the live document.

## Why not zustand

zustand would work for the document store. The break happens at the other two
requirements.

- **The interaction lifecycle wants a machine.** Modelling `idle/dragging` as
  zustand fields means hand-writing the guards (`can I drop?`), the entry resets
  (clear `subject`/`intent` on return to idle), and the legal-transition checks that
  XState gives declaratively. We'd be reimplementing a state machine inside a store,
  worse.
- **persist would mean a second store.** zustand's `persist` middleware serializes
  one store's state to storage. Our document already has a serialization contract
  (`serialize.ts`, below) that does schema validation and versioned migration —
  things `persist` doesn't do. Wiring `persist` in would create a second persistence
  path with different guarantees, and the history wrapper around the model doesn't
  serialize cleanly anyway (you persist the `present`, not the past/future stacks).
- **Two libraries for one concern.** Using zustand for the document and XState for
  the drag lifecycle means two mental models and two ways state flows. XState already
  ships as a core dependency for the interaction machine, so spending it on the
  document too keeps the surface to one library and one event vocabulary
  (`send`/`emit`).

## How persistence rides on serialize.ts, not getPersistedSnapshot

XState v5 offers `actor.getPersistedSnapshot()` for snapshotting an actor. We don't
use it for layout persistence, and the reason is the same as the zustand `persist`
rejection: a persisted actor snapshot includes the full undo/redo history and machine
bookkeeping, and it carries no schema validation or migration.

Instead, `packages/react/src/persistence.ts` persists the **model**, through the
serialization contract in `packages/core/src/serialize.ts`:

| Concern    | Function   | What it does                                             |
| ---------- | ---------- | -------------------------------------------------------- |
| Save       | `toJSON`   | `JSON.stringify` of the live `Dashfoo` model             |
| Load       | `fromJSON` | parse → `migrate` → `dashfooSchema.parse` → `normalize`  |
| Versioning | `migrate`  | stamps `CURRENT_VERSION` (1) and upgrades older payloads |

Persistence (the `persist` prop, built on `usePersistence`) loads the saved model
once (validated and migrated via `fromJSON`, falling back to `defaultModel` on a
miss or on corruption), debounce-saves every change with `toJSON`, and prunes a
corrupt stored value on mount. The `StorageAdapter` shape
(`getItem`/`setItem`/`removeItem`) means it persists to `localStorage`,
`sessionStorage`, an in-memory map, or a custom backend.

So persistence operates on the canonical `Dashfoo` model, not on actor internals.
That keeps the on-disk format a documented, validated, migratable schema — independent
of whatever XState's snapshot format happens to be in v5 — and the same `fromJSON`
boundary that loads from storage also guards a host-supplied model.

## Consequences

- The model never persists the undo stack. Reloading a saved layout starts with empty
  history, which is the right behavior. You don't undo across a page reload.
- The two machines stay in `@dashfoo/core` as pure, framework-free actors;
  `@dashfoo/react` only binds them. The drag adapter (dnd-kit) maps pointer/keyboard
  input to the abstract `START`/`OVER`/`DROP`/`CANCEL` events, so the interaction
  logic is testable without a DOM.
- Anyone reaching for `getPersistedSnapshot` or zustand `persist` should read this
  ADR first. The persistence path is `serialize.ts`, deliberately.

## Alternatives considered

1. **zustand store + `persist` middleware for the document; ad-hoc fields for the
   drag.** Rejected. Reimplements a state machine for the drag lifecycle, and forks
   persistence away from the validated/versioned `serialize.ts` contract.
2. **Single XState machine for document and drag combined.** Rejected. It entangles
   transient drag state with the undo-tracked document, blurring which writes belong
   in history. The `COMMIT` emit between two machines is the clean seam.
3. **XState `getPersistedSnapshot` / `createActor(machine, { snapshot })` for
   persistence.** Rejected. Persists history and machine bookkeeping, skips schema
   validation and migration, and couples the storage format to XState's snapshot
   shape.

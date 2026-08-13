# Plan 003: Bound the undo history to a fixed number of steps

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 912bf52..HEAD -- packages/core/src/state/history.ts packages/core/src/state/history.test.ts packages/core/README.md` —
> written against commit `912bf52` plus uncommitted feature work. Trust the
> "Current state" excerpts; mismatch = STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `912bf52` (+ uncommitted tree), 2026-06-10

## Why this matters

Every dispatched action appends a full `structuredClone` snapshot of the model
to the undo `past` array, forever — and _every_ action is an undo step,
including `selectTab`/`setActiveTabset` (a plain tab click). A long-lived
dashboard session therefore grows memory linearly with user interactions, in
published library code (`@dashfoo/core`). Models are small (KBs), so this is a
slow leak, not a crash — but it is unbounded, and the fix is a few lines.

**Policy note**: the project is pre-adoption — breaking behavior changes are
fine, no config knob or deprecation path is required. A fixed constant is the
whole feature.

## Current state

- `packages/core/src/state/history.ts` (55 lines, whole file is relevant):

  ```ts
  // packages/core/src/state/history.ts:24-27
  const dispatch = (history: History, action: Action): History => {
    const present = reducer(history.present, action);
    return { future: [], past: [...history.past, history.present], present };
  };
  ```

  `redo` (lines 41–51) also appends to `past`:

  ```ts
  return {
    future: rest,
    past: [...history.past, history.present],
    present: next,
  };
  ```

  `undo` moves `past` entries into `future`, so `future` can never exceed what
  `past` held — bounding `past` at append time bounds the whole structure.

- The file's header comment (lines 6–8) notes each committed action is its own
  undo step and rrp v4 commits one `adjustSplit` per splitter release (verified:
  the e2e test "undo and redo restore resized panel dimensions" restores the
  pre-drag width with a single undo). So bounding does NOT need coalescing —
  drags are already one step.

- Tests live in `packages/core/src/state/history.test.ts` (vitest; same dir).
- `packages/core/README.md` documents history around lines 205–256
  ("`history` — `createHistory`, `dispatch`, `undo`, `redo`, `canUndo`,
  `canRedo`; type `History`") and the root `README.md` says "Undo/redo is a
  pure helper over `past · present · future`; every committed action is one
  undo step…".
- Repo conventions: arrow functions, `const`, MACRO_CASE constants, exports
  grouped at the end of the file, WHY-comments only.

## Commands you will need

| Purpose        | Command                                                         | Expected on success |
| -------------- | --------------------------------------------------------------- | ------------------- |
| Core tests     | `cd packages/core && pnpm vitest run src/state/history.test.ts` | all pass            |
| All core tests | `pnpm --filter @dashfoo/core test`                              | all pass            |
| Typecheck      | `pnpm typecheck`                                                | exit 0              |
| Full check     | `pnpm lint && pnpm test && pnpm build`                          | exit 0              |

## Scope

**In scope**:

- `packages/core/src/state/history.ts`
- `packages/core/src/state/history.test.ts`
- `packages/core/README.md` (one sentence)
- `README.md` (one clause, optional — only if the sentence quoted above still exists)
- `.changeset/<new-file>.md` (create)

**Out of scope**:

- `packages/core/src/state/reducer.ts` — the per-action `structuredClone` is by design (immutability); do not optimize it here.
- `packages/core/src/machines/*` — the machines call the history helpers; they need no change.
- `packages/react/**` — consumes history via core exports only.
- Making the limit configurable — explicitly rejected; a constant is enough.

## Git workflow

- Branch: current feature branch if instructed, else `advisor/003-bound-undo-history`.
- Commit style: `fix(core): bound undo history to the most recent 100 steps`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add the bound in `history.ts`

Add a module constant and trim at both append sites:

```ts
// Snapshots are full model clones, so an unbounded past grows memory for the
// life of the session (every action — even a tab click — is one step). 100
// steps is far beyond practical undo depth while keeping memory flat.
const HISTORY_LIMIT = 100;
```

In `dispatch` and in `redo`, build the new past as
`[...history.past, history.present].slice(-HISTORY_LIMIT)`.

Export `HISTORY_LIMIT` alongside the existing exports (exports at end of file,
matching the file's current export statement) so tests don't hardcode 100 twice.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Tests

In `packages/core/src/state/history.test.ts`, following the existing test
style in that file, add:

1. _past is capped at HISTORY_LIMIT_: dispatch `HISTORY_LIMIT + 10` distinct
   actions (e.g. repeated `renameTab` with different names — pick an action the
   existing tests already construct fixtures for); assert
   `history.past.length === HISTORY_LIMIT`.
2. _oldest steps are dropped, newest kept_: after the above, undo
   `HISTORY_LIMIT` times; assert the resulting `present` equals the state after
   the 10th dispatch (not the initial model), and `canUndo` is now false.
3. _redo respects the cap_: from a history at the cap, undo once then dispatch
   `redo` — wait, redo after a new dispatch is cleared (`future: []`); instead:
   undo once, redo once, assert `past.length === HISTORY_LIMIT` (redo's append
   also trims).

**Verify**: `cd packages/core && pnpm vitest run src/state/history.test.ts` → all pass, including 3 new tests.

### Step 3: Documentation sentence

- `packages/core/README.md`, history section: add one sentence — "History keeps
  the most recent `HISTORY_LIMIT` (100) steps; older snapshots are dropped."
- Root `README.md`: if the sentence "every committed action is one undo step"
  still exists, append "(the most recent 100 are kept)".

**Verify**: `grep -rn "100" packages/core/README.md | grep -i histor` → one hit.

### Step 4: Changeset

Create `.changeset/bound-undo-history.md`:

```md
---
"@dashfoo/core": patch
---

Bound the undo history to the most recent 100 steps. Every action snapshots the full model; an unbounded `past` grew memory for the life of a session.
```

**Verify**: `pnpm lint && pnpm test && pnpm build` → exit 0.

## Test plan

See Step 2 — three new cases in `packages/core/src/state/history.test.ts`,
modeled on the file's existing tests. Also confirm no existing test asserts
unbounded depth (`grep -n "past" packages/core/src/state/history.test.ts` and
read the matches before editing).

## Done criteria

- [ ] `grep -n "HISTORY_LIMIT" packages/core/src/state/history.ts` → constant defined, used in `dispatch` and `redo`, exported
- [ ] 3 new history tests pass; `pnpm --filter @dashfoo/core test` → exit 0
- [ ] `pnpm typecheck && pnpm lint && pnpm build` → exit 0
- [ ] Changeset file exists with a `patch` bump for `@dashfoo/core`
- [ ] `git status` shows only in-scope files (+ `plans/README.md`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `history.ts` no longer matches the excerpts (e.g. someone added coalescing or
  a limit already) — report.
- An existing test fails because it depends on unbounded history — report the
  test name instead of weakening it.
- The xstate machines (`packages/core/src/machines/dashfoo-machine.ts`) turn
  out to construct history snapshots somewhere other than the two append sites
  — report; the bound must live in `history.ts` only.

## Maintenance notes

- If per-frame action sources ever appear (today rrp commits one `adjustSplit`
  per release — see `packages/react/src/components/row-view.tsx:86-135`), the
  limit alone won't keep undo _useful_; coalescing would become the follow-up.
- Reviewers: check the off-by-one at the cap (`slice(-HISTORY_LIMIT)` after the
  append, so `past` holds exactly the limit, not limit+1).

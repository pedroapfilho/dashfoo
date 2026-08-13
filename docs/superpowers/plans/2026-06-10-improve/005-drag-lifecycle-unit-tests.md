# Plan 005: Unit-test the drag manager lifecycle (StrictMode survival, shared vs. own manager)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 912bf52..HEAD -- packages/react/src/components/drag-root.tsx packages/react/src/hooks/drag-hooks.tsx packages/react/src/components/drag-adapter.tsx` —
> written against commit `912bf52` **plus uncommitted feature work** (the
> drag-root/shared-manager code is part of that uncommitted work). Trust the
> excerpts; mismatch = STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (test-only; no production code changes except optional test hooks — see STOP conditions)
- **Depends on**: plans/004-harden-external-createtab.md (creates the sibling test file; land 004 first to avoid collisions)
- **Category**: tests
- **Planned at**: commit `912bf52` (+ uncommitted tree), 2026-06-10

## Why this matters

The drag system is the library's core feature, and its riskiest part is
invisible: the `@dnd-kit/dom` `DragDropManager` lifecycle. A past regression —
destroying the manager in a `useEffect` cleanup, which React StrictMode
double-fires — silently killed ALL drag events and cost hours to diagnose,
because nothing fails loudly: draggables still construct, the page renders,
drags just don't start. Today that invariant (and the new shared-manager
selection logic in `DragProvider`) is protected only by Playwright e2e in the
demo app. These unit tests make the failure mode cheap to catch at
`pnpm test` speed.

## Current state

- `packages/react/src/components/drag-root.tsx` (27 lines) — `DashfooDragProvider`
  creates one manager and provides it via context:

  ```tsx
  const DashfooDragProvider = ({ children }: { children: ReactNode }): ReactNode => {
    // useState lazily constructs the manager once; the destroy rides a
    // useInsertionEffect cleanup (not useEffect) so StrictMode's simulated unmount
    // doesn't tear down the live instance — the same pattern DragProvider uses.
    const [manager] = useState(createDragManager);
    useInsertionEffect(() => () => manager.destroy(), [manager]);

    return (
      <SharedDragManagerContext.Provider value={manager}>
        {children}
      </SharedDragManagerContext.Provider>
    );
  };
  ```

- `packages/react/src/hooks/drag-hooks.tsx` — owns `createDragManager()` (a
  `DragDropManager` with the Accessibility/Feedback plugins and KeyboardSensor
  filtered out), `SharedDragManagerContext` (`Context<DragDropManager | null>`,
  default `null`), `DragContext` (internal `{ manager, registerTabset }`), and
  `useExternalTabSource` (registers a `Draggable` with
  `data: { createTab, type: "external" }` on
  `DragContext.manager ?? SharedDragManagerContext`). All of these are exported
  from the module (NOT from the package's public `src/index.ts`, except
  `useExternalTabSource`), so a test file inside `packages/react/src` can
  import them directly.

- `packages/react/src/components/drag-adapter.tsx` — `DragProvider` selects its
  manager (~lines 128–146):

  ```ts
  const sharedManager = useContext(SharedDragManagerContext);
  const [ownManager] = useState(() => (sharedManager ? null : createDragManager()));
  useInsertionEffect(() => () => ownManager?.destroy(), [ownManager]);
  const manager = sharedManager ?? ownManager;
  if (manager === null) {
    throw new Error(
      "[dashfoo] DashfooDragProvider unmounted while its layout is still mounted; keep the provider above the layout or remount the layout",
    );
  }
  ```

  and exposes `manager` to children through `DragContext.Provider`
  (`contextValue = { manager, registerTabset }`, end of the component).

- Test setup: vitest + `@testing-library/react` (`renderHook`, `render`) — see
  `packages/react/src/hooks/persistence.test.ts` and
  `packages/react/src/components/dashfoo-layout.test.tsx` for the house style.
  jsdom environment (configured via `packages/config-vitest`).

- `@dnd-kit/dom@0.4.0` (pinned). What its `DragDropManager` exposes for
  inspection is NOT verified by this plan's author — discovering an assertable
  surface is Step 1. Known-available from production code: `manager.destroy()`,
  `manager.monitor.addEventListener(type, fn)` (returns an unsubscribe
  function), `manager.registry` (existence unverified).

## Commands you will need

| Purpose               | Command                                                                                                 | Expected on success               |
| --------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Run new tests         | `cd packages/react && pnpm vitest run src/components/drag-lifecycle.test.tsx`                           | all pass                          |
| All react tests       | `pnpm --filter @dashfoo/react test`                                                                     | all pass                          |
| Typecheck             | `pnpm typecheck`                                                                                        | exit 0                            |
| Inspect dnd-kit types | `cat node_modules/@dnd-kit/dom/dist/*.d.ts \| less` (or the `node_modules/@dnd-kit/dom` package layout) | find manager/registry/monitor API |

## Scope

**In scope**:

- `packages/react/src/components/drag-lifecycle.test.tsx` (create — one file for these lifecycle tests)

**Out of scope**:

- ANY production source change. If an assertion is impossible without one, that
  is a STOP condition, not a license to add test hooks.
- `drag-adapter.test.ts` (plan 004's file — `subjectFor` cases live there).
- Playwright e2e — unchanged.

## Git workflow

- Branch: current feature branch if instructed, else `advisor/005-drag-lifecycle-tests`.
- Commit style: `test(react): cover drag manager lifecycle (StrictMode, shared vs own manager)`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Discover the assertable surface of `DragDropManager`

Read `node_modules/@dnd-kit/dom`'s type declarations (and `@dnd-kit/abstract`,
which it re-exports from). Answer three questions and write the answers as a
comment block at the top of the new test file:

1. Does the manager expose a usable registry of draggables (e.g.
   `manager.registry.draggables`) that tests can read?
2. Is there an observable "destroyed/disposed" state, OR does
   `monitor.addEventListener` throw/no-op after `destroy()`?
3. Can a `Draggable` be constructed in jsdom without real pointer events (it
   can — production code does `new Draggable({ data, id }, manager)` in
   effects; confirm no DOM APIs missing in jsdom break construction)?

**Verify**: the comment block exists and cites the actual type/source files read.

### Step 2: Shared-vs-own manager selection tests

In `drag-lifecycle.test.tsx` (jsdom, `@testing-library/react` `render`):

1. _standalone layout creates its own manager_: render a probe component that
   reads `DragContext` inside `<DragProvider onCommit={() => {}}>…` — assert
   `DragContext.manager` is non-null. (`DragProvider`, `DragContext` import
   from `../components/drag-adapter` and `../hooks/drag-hooks`.)
2. _provider-supplied manager is used_: render
   `<DashfooDragProvider><Probe/></DashfooDragProvider>` where `Probe` reads
   `SharedDragManagerContext`, then render a `DragProvider` under the same
   provider with an inner probe reading `DragContext` — assert
   `DragContext.manager === SharedDragManagerContext` value (same instance,
   `toBe` identity).

### Step 3: StrictMode survival tests

3. _manager survives StrictMode double-mount_: render
   `<StrictMode><DashfooDragProvider><Probe/></DashfooDragProvider></StrictMode>`,
   capture every manager instance the probe sees across renders — assert all
   captured instances are identical AND the manager is still live afterwards
   (using the liveness signal from Step 1, e.g. `monitor.addEventListener`
   returns a working unsubscribe / registry still accepts a `Draggable`).
   This is the regression test for the historical `useEffect`-cleanup bug: if
   someone changes `useInsertionEffect` back to `useEffect`, StrictMode's
   simulated unmount destroys the live manager and this test must fail.
4. Same assertion for standalone `DragProvider` under `StrictMode`.

### Step 4: External source registration lifecycle (feasibility-gated)

5. _useExternalTabSource registers and unregisters_: render a component using
   `useExternalTabSource({ createTab, label: "X" })` under
   `DashfooDragProvider`, attach its `ref` to a real element; if Step 1 found a
   readable registry: assert one draggable registered, then unmount and assert
   it is gone. If the registry is NOT readable, skip this case and note it in
   the test file comment (the destroy-on-unmount behavior remains covered
   indirectly by e2e).

**Verify (steps 2–4)**: `cd packages/react && pnpm vitest run src/components/drag-lifecycle.test.tsx` → all written tests pass; `pnpm --filter @dashfoo/react test` → full suite still green.

## Test plan

This plan IS the test plan: 4–5 cases as specified, structural pattern
`packages/react/src/components/dashfoo-layout.test.tsx` (component render
tests) — use real timers; no mocking of @dnd-kit (the point is to test the real
manager lifecycle).

## Done criteria

- [ ] `drag-lifecycle.test.tsx` exists with ≥4 passing tests (case 5 may be documented-skipped per Step 4)
- [ ] Reverting `useInsertionEffect` → `useEffect` in `drag-root.tsx` locally makes test 3 fail (manually verify once, then revert the revert — `git diff` must be clean of production changes afterwards)
- [ ] `pnpm --filter @dashfoo/react test` → exit 0
- [ ] `pnpm typecheck && pnpm lint` → exit 0
- [ ] `git status` shows ONLY the new test file (+ `plans/README.md`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Step 1 finds no liveness signal at all (no registry, no observable destroyed
  state, addEventListener silently works on a destroyed manager) — then test 3
  cannot detect the regression; report findings instead of writing a test that
  asserts nothing.
- Any assertion requires modifying production source (adding test hooks,
  exporting more internals than drag-hooks already exports) — report.
- `DragDropManager` construction throws in jsdom — report the missing DOM API;
  do not polyfill ad hoc.

## Maintenance notes

- These tests intentionally pin the `useInsertionEffect` destroy pattern. If
  @dnd-kit/dom is upgraded past 0.4.0, expect Step 1's discovered surface to
  shift — update the liveness assertions, not the invariant.
- The done criterion "revert makes it fail" is the actual value of this plan;
  reviewers should ask for the screenshot/log of that one-time check.

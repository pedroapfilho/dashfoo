# Plan 004: Harden the external drag source against a throwing `createTab`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 912bf52..HEAD -- packages/react/src/components/drag-adapter.tsx packages/react/src/hooks/drag-hooks.tsx` —
> written against commit `912bf52` **plus uncommitted feature work** (the
> external-drag feature itself is part of that uncommitted work, so the SHA
> alone is meaningless here — the excerpts below are the baseline). Mismatch = STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (plan 005 builds on the test file this plan creates)
- **Category**: bug
- **Planned at**: commit `912bf52` (+ uncommitted tree), 2026-06-10

## Why this matters

`useExternalTabSource({ createTab })` lets host apps register widgets that can
be dragged into a layout. At drag start the adapter calls the consumer's
`createTab()` unguarded — if that callback throws (a buggy widget catalog, a
failed lookup), the exception propagates into @dnd-kit's `dragstart` dispatch
and breaks the drag interaction with no actionable message. The repo's own bar
is "no silent failures; handle async failures"; a consumer callback is exactly
where defensive handling belongs. The validation-failure path right next to it
already warns and aborts — a throw should behave the same way.

## Current state

- `packages/react/src/components/drag-adapter.tsx` — `subjectFor`, module scope
  (~lines 88–118). Current code:

  ```ts
  const isTabFactory = (value: unknown): value is () => unknown => typeof value === "function";

  // A tabset grip carries { tabsetId, type: "tabset" }; an external source
  // (useExternalTabSource) carries { createTab, type: "external" } and its tab is
  // built and validated at drag start; a plain tab carries its id. null aborts
  // the drag — the machine stays idle, so the following OVER/DROP are ignored.
  const subjectFor = (source: {
    data?: Record<string, unknown>;
    id: string | number;
  }): DragSubject | null => {
    const data = source.data;
    if (data?.type === "tabset") {
      return { id: String(data.tabsetId), kind: "tabset" };
    }
    if (data?.type === "external") {
      if (!isTabFactory(data.createTab)) {
        // A wired-up source that can't produce a tab must not fail silently.
        // oxlint-disable-next-line no-console
        console.warn("[dashfoo] external drag source is missing its createTab function");
        return null;
      }
      const parsed = tabNodeSchema.safeParse(data.createTab());
      if (!parsed.success) {
        // oxlint-disable-next-line no-console
        console.warn("[dashfoo] external drag source returned an invalid tab", parsed.error);
        return null;
      }
      return { id: String(source.id), kind: "external", tab: parsed.data };
    }
    return { id: String(source.id), kind: "tab" };
  };
  ```

  `subjectFor` is currently module-private; the file's export statement (last
  line) is:
  `export { DragProvider, useDragSubject, useTabDraggable, useTabsetDraggable, useTabsetDroppable };`

- `packages/react/src/hooks/drag-hooks.tsx` — `useExternalTabSource`
  (~lines 160–185) keeps the latest `createTab` in a ref via a deliberately
  dependency-less effect:

  ```ts
  const createTabRef = useRef(createTab);
  useEffect(() => {
    createTabRef.current = createTab;
  });
  ```

  There is no comment explaining the empty-deps-on-purpose pattern; a future
  edit "fixing" it to `[createTab]` would still work, but the bare form is the
  ref-sync idiom used elsewhere in the file (`configRef` in `persistence.ts`
  uses the same shape) — document the intent.

- Test conventions: vitest, colocated `*.test.ts(x)`. The console-warn spy
  pattern to copy lives in
  `packages/react/src/hooks/persistence.test.ts` ("a corrupt stored value warns
  and is removed on mount"): `const warn = vi.spyOn(console, "warn").mockImplementation(() => {});`
  … assert … `warn.mockRestore()`.
- There is currently NO `drag-adapter.test.ts` — this plan creates it.
- Conventions: no `as any`; arrow fns; exports at end; WHY comments;
  `console.warn("[dashfoo] …")` prefix for library warnings.

## Commands you will need

| Purpose         | Command                                                                    | Expected on success |
| --------------- | -------------------------------------------------------------------------- | ------------------- |
| React tests     | `cd packages/react && pnpm vitest run src/components/drag-adapter.test.ts` | all pass            |
| All react tests | `pnpm --filter @dashfoo/react test`                                        | all pass            |
| Typecheck       | `pnpm typecheck`                                                           | exit 0              |
| Lint            | `pnpm lint`                                                                | exit 0              |

## Scope

**In scope**:

- `packages/react/src/components/drag-adapter.tsx` (the `subjectFor` function + export list)
- `packages/react/src/components/drag-adapter.test.ts` (create)
- `packages/react/src/hooks/drag-hooks.tsx` (one comment)
- `.changeset/<new-file>.md` (create)

**Out of scope**:

- `packages/react/src/index.ts` — `subjectFor` stays internal; do NOT add it to the public API.
- `packages/core/**` — the machine and schema are correct as-is.
- The `DragProvider` manager lifecycle — covered by plan 005.

## Git workflow

- Branch: current feature branch if instructed, else `advisor/004-harden-external-createtab`.
- Commit style: `fix(react): abort the drag when an external source's createTab throws`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Guard the `createTab()` call

In `subjectFor`, wrap the factory call so a throw warns and aborts like the
other failure paths (matching their comment/warn style):

```ts
let candidate: unknown;
try {
  candidate = data.createTab();
} catch (error) {
  // A consumer callback that throws must abort the drag, not break dragging.
  // oxlint-disable-next-line no-console
  console.warn("[dashfoo] external drag source createTab threw", error);
  return null;
}
const parsed = tabNodeSchema.safeParse(candidate);
```

(The rest of the external branch is unchanged.)

**Verify**: `pnpm typecheck && pnpm lint` → exit 0.

### Step 2: Export `subjectFor` for tests

Add `subjectFor` to the existing export statement at the end of
`drag-adapter.tsx`. It is not re-exported from `src/index.ts`, so the public
API is unchanged (confirm: `grep -n "drag-adapter" packages/react/src/index.ts`
→ no direct re-export of the module's named exports beyond what
`dashfoo-layout.tsx` imports internally — actually `index.ts` does not export
from drag-adapter at all; verify with the grep and proceed).

**Verify**: `pnpm build && grep -n "subjectFor" packages/react/dist/index.d.ts` → no match (stays out of the public types).

### Step 3: Unit tests for `subjectFor`

Create `packages/react/src/components/drag-adapter.test.ts` covering, with the
persistence-test warn-spy pattern:

1. a source with `data: { type: "tabset", tabsetId: "ts1" }` → `{ id: "ts1", kind: "tabset" }`
2. a plain tab source (`data: { type: "tab" }`, id `"t1"`) → `{ id: "t1", kind: "tab" }`
3. external + valid `createTab` returning `{ component: "metrics", id: "w1", name: "Metrics", type: "tab" }` → kind `"external"` carrying that tab
4. external + `createTab` missing → `null` + warn containing "missing its createTab"
5. external + `createTab` returning junk (`{}`) → `null` + warn containing "invalid tab"
6. external + `createTab` that throws → `null` + warn containing "createTab threw" (this is the regression case for step 1)

**Verify**: `cd packages/react && pnpm vitest run src/components/drag-adapter.test.ts` → 6 tests pass.

### Step 4: Comment the ref-sync effect

In `drag-hooks.tsx`, above the `useEffect(() => { createTabRef.current = createTab; });`
add: `// Dependency-less on purpose: a plain ref sync so drags always call the latest createTab.`

**Verify**: `pnpm lint` → exit 0.

### Step 5: Changeset

Create `.changeset/harden-external-createtab.md`:

```md
---
"@dashfoo/react": patch
---

An external drag source whose `createTab` throws now warns and aborts that drag instead of breaking the drag interaction.
```

**Verify**: `pnpm --filter @dashfoo/react test` → all pass.

## Test plan

The six `subjectFor` cases in Step 3, modeled structurally on
`packages/react/src/hooks/persistence.test.ts` (plain function tests — no
rendering needed since `subjectFor` is a pure function of its argument).

## Done criteria

- [ ] A throwing `createTab` produces a `[dashfoo]` warning and a `null` subject (test 6 passes)
- [ ] `pnpm --filter @dashfoo/react test` → exit 0, 6 new tests included
- [ ] `subjectFor` absent from `packages/react/dist/index.d.ts` after `pnpm build`
- [ ] `pnpm typecheck && pnpm lint` → exit 0
- [ ] Changeset exists (patch, `@dashfoo/react`)
- [ ] `git status` shows only in-scope files (+ `plans/README.md`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `subjectFor` doesn't match the excerpt (drifted) — report.
- `index.ts` turns out to re-export `*` from `drag-adapter` (it should not — it
  exports from `./components/dashfoo-layout`, `./components/drag-root`, etc.) —
  if it does, exporting `subjectFor` would leak it publicly: report instead.
- Test 6 cannot be made to pass without altering machine or hook code — report;
  the fix must stay inside `subjectFor`.

## Maintenance notes

- Plan 005 adds lifecycle tests in sibling files; keep `drag-adapter.test.ts`
  focused on `subjectFor` so the two don't merge into a grab-bag.
- If external sources ever carry async factories (`createTab: () => Promise<TabNode>`),
  this guard and the machine's synchronous START path both need rework — that
  is a deliberate non-goal today.

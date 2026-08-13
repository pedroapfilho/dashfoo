# Plan 006: Move @dashfoo/core to zod 4

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 912bf52..HEAD -- packages/core/package.json packages/core/src` —
> written against commit `912bf52` plus uncommitted feature work. Trust the
> excerpts; mismatch = STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (validation behavior differences can surface in tests; contained to one package)
- **Depends on**: none (run LAST among the current plans — it touches the most files; a green `pnpm verify` from plan 001 is the safety net)
- **Category**: migration
- **Planned at**: commit `912bf52` (+ uncommitted tree), 2026-06-10

## Why this matters

`@dashfoo/core` is a freshly published library carrying `zod ^3.25.0` as a
runtime dependency while the ecosystem — including this repo's own docs app,
whose lockfile already resolves `zod@4.4.3` via fumadocs — has moved to zod 4
(GA). Consumers on zod 4 get two zod copies in their bundle; staying on v3
walks the library toward zod 3's maintenance tail. **Project policy applies:
there are no external users yet — breaking changes are free, no compatibility
shims or deprecation steps.** This is a clean one-package bump.

## Current state

- `packages/core/package.json` — `"zod": "^3.25.0"` under `dependencies`.
  zod is the package's only runtime dep besides xstate. It is externalized by
  the tsdown build (dependencies are not bundled), so the bump changes the
  declared range, not the artifact shape.
- ~98 `z.` call sites across `packages/core/src` (`grep -rn "z\." packages/core/src --include="*.ts" | grep -v test | wc -l`).
  Concentrated in:
  - `packages/core/src/model/schema.ts` — the model schemas: `z.object`,
    `z.literal(1)` (version pin), `z.enum`, `z.union`, `z.lazy` (recursive
    `rowNodeSchema`), `z.array`, `z.number`, `z.string`, `z.boolean`,
    `.optional()`, `z.infer`.
  - `packages/core/src/state/actions.ts` — `z.discriminatedUnion("type", […])`,
    `.pick(…)`, `.partial()`, `z.number().int().optional()`.
  - `packages/core/src/model/serialize.ts` — `parseModel` validates via
    `dashfooSchema.parse`/`safeParse` and surfaces errors.
- Consumers inside the repo: `packages/react` imports schemas/types from
  `@dashfoo/core` only (no direct zod dependency — confirm:
  `grep -n '"zod"' packages/react/package.json` → no match). The demo and docs
  apps consume core through react.
- Lockfile currently resolves both `zod@3.25.x` (core) and `zod@4.4.x`
  (fumadocs chain) — after this plan, ideally only the v4 line remains
  (fumadocs' range permitting).

## zod 3 → 4 cheat sheet (check each against actual usage; most core usage is unaffected)

- `import { z } from "zod"` — unchanged.
- `z.object/literal/enum/union/discriminatedUnion/lazy/array/infer`, `.optional/.pick/.partial`, `parse/safeParse` — unchanged for the shapes used here.
- `z.record(valueSchema)` single-argument form was removed — v4 requires `z.record(keySchema, valueSchema)`. Grep: `grep -rn "z.record" packages/core/src`.
- `.passthrough()` → `z.looseObject(...)`, `.strict()` → `z.strictObject(...)`. Grep both.
- String formats moved top-level (`z.email()` etc.) — grep `.email\|.url\|.uuid`.
- Custom error params changed (`message:`/`errorMap:` → unified `error:`). Grep `message:` inside schema files.
- `ZodError`: `.errors` alias removed — use `.issues`; `.format()` deprecated in favor of `z.treeifyError`. Grep `\.errors\b` and `\.format(` in src AND tests.
- Default error _messages_ changed wording — any test asserting exact zod message text will need its expected string updated (update the expectation, do not pin old wording).

## Commands you will need

| Purpose        | Command                                                                                    | Expected on success                 |
| -------------- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| Bump + install | edit package.json, then `pnpm install`                                                     | exit 0, lockfile updated            |
| Core typecheck | `pnpm --filter @dashfoo/core typecheck`                                                    | exit 0                              |
| Core tests     | `pnpm --filter @dashfoo/core test`                                                         | all pass                            |
| Whole repo     | `pnpm verify` (after plan 001) or `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | exit 0                              |
| E2E            | `pnpm --filter demo-vite test:e2e`                                                         | all pass                            |
| Dedupe check   | `pnpm why zod`                                                                             | ideally a single major version line |

## Scope

**In scope**:

- `packages/core/package.json` (the zod range → `^4.0.0` or current latest major-4 range)
- `pnpm-lock.yaml` (via `pnpm install` only)
- `packages/core/src/**/*.ts` — only the minimal edits the v4 typecheck forces
- `packages/core/src/**/*.test.ts` — only error-message/issue-shape expectation updates the upgrade forces
- `.changeset/<new-file>.md` (create)

**Out of scope**:

- `packages/react/**`, `apps/**` — no direct zod usage; they must pass untouched.
- Adopting `zod/mini`, refactoring schema structure, or "improving" schemas while in there — bump only.
- fumadocs/next dependency ranges in `apps/docs`.

## Git workflow

- Branch: current feature branch if instructed, else `advisor/006-zod-4-core`.
- Commit style: `chore(core)!: upgrade zod to v4` (repo uses conventional-ish messages; the `!` is informational — pre-adoption policy means no migration notes needed).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Inventory the v4-sensitive patterns

Run the greps from the cheat sheet over `packages/core/src` (including tests).
Record the hit list in your working notes. Expected result based on the
author's read: few or zero hits for `z.record`/`.passthrough`/string formats;
possible hits for error-shape access in `serialize.ts`/tests.

**Verify**: each grep ran; hits noted.

### Step 2: Bump and install

Set `"zod": "^4.0.0"` in `packages/core/package.json`; `pnpm install`.

**Verify**: `pnpm why zod` → core resolves a 4.x version.

### Step 3: Fix compile errors

`pnpm --filter @dashfoo/core typecheck`; fix each error per the cheat sheet.
Keep edits minimal and mechanical.

**Verify**: `pnpm --filter @dashfoo/core typecheck` → exit 0.

### Step 4: Fix test expectation drift

`pnpm --filter @dashfoo/core test`; where failures are exact-message or
issue-shape assertions, update expectations to v4's actual output (run the test
to see it, then assert that).

**Verify**: `pnpm --filter @dashfoo/core test` → all pass.

### Step 5: Whole-repo verification

**Verify**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → exit 0;
then `pnpm --filter demo-vite test:e2e` → all pass (the persistence specs
exercise `fromJSON` validation end-to-end).

### Step 6: Changeset

Create `.changeset/zod-4.md`:

```md
---
"@dashfoo/core": minor
---

Upgrade zod to v4. Schema behavior is unchanged for valid payloads; invalid-payload error messages follow zod 4's wording.
```

**Verify**: file exists; `pnpm build` still green.

## Test plan

No new tests — the existing schema/serialize/reducer/machine suites in
`packages/core` are the characterization net (this is exactly what they are
for). The e2e persistence specs cover the load-validate path in a real browser.

## Done criteria

- [ ] `packages/core/package.json` declares zod `^4.x`
- [ ] `pnpm why zod` shows core on 4.x (note in the index if 3.x still appears via an unrelated chain)
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → exit 0
- [ ] `pnpm --filter demo-vite test:e2e` → all pass
- [ ] No edits outside `packages/core` + lockfile + changeset (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Step 3 surfaces type errors NOT explained by the cheat sheet in more than a
  handful of places (the schema design itself collides with v4 semantics) —
  report the error list before changing schema shapes.
- Any test failure in Step 4 that is a _behavioral_ difference (valid payload
  now rejected, or invalid payload now accepted) rather than message wording —
  report immediately; that changes the persistence format's acceptance and
  must be a deliberate decision.
- `packages/react` or an app needs ANY edit to pass — report (they have no
  direct zod usage; an edit there means types leaked differently than assumed).

## Maintenance notes

- After this lands, the lockfile should converge toward one zod major; if
  fumadocs still pins something odd, leave it — apps are not published.
- zod 4 has `zod/mini` for smaller bundles; core externalizes zod so the win
  accrues to consumers, not this repo. Considered and deferred — revisit if a
  consumer reports bundle pressure.

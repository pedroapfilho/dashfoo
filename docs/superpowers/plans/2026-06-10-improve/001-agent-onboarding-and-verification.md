# Plan 001: Add repo-level CLAUDE.md, a one-command verify script, and fix test caching

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 912bf52..HEAD -- package.json turbo.json README.md` —
> NOTE: this plan was written against commit `912bf52` **plus uncommitted
> feature-branch work** (persistence flush, external drag sources, demo
> restructure). Trust the "Current state" excerpts over the SHA; if an excerpt
> doesn't match the live file, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `912bf52` (+ uncommitted tree), 2026-06-10

## Why this matters

The repo has no CLAUDE.md/CONTRIBUTING at its root, so every contributor — and
every coding agent executing the other plans in this directory — must
reassemble the build commands, conventions, and gotchas from `package.json`,
`turbo.json`, CI config, and tribal knowledge. There is also no single command
that answers "is the codebase good?", and `turbo.json` disables caching on the
`test` task, so CI and local loops re-run unchanged tests every time. This plan
is first because it makes all later plans cheaper to execute correctly.

## Current state

- `package.json` (repo root) — scripts are `dev/lint/format/format:check/typecheck/build/clean/test/test:coverage/changeset/version-packages/release/prepare`. There is no `verify` script.
- `turbo.json` — the test task is:

```json
"test": {
  "dependsOn": ["^build"],
  "outputs": ["coverage/**"],
  "cache": false
},
```

- `README.md` — has a Scripts/usage area near the bottom (search for `pnpm dev`); it does not explain that `pnpm dev` is a persistent watch mode, does not mention any verify command, and does not document the one-time Playwright browser install needed before e2e (`.github/workflows/ci.yml` runs `pnpm --filter demo-vite exec playwright install --with-deps chromium`).
- No `CLAUDE.md`, `AGENTS.md`, or `CONTRIBUTING.md` exists at the repo root (verify with `ls CLAUDE.md AGENTS.md CONTRIBUTING.md` → all "No such file").
- Monorepo layout: published packages `packages/core` (framework-free engine), `packages/react` (React binding), `packages/theme` (CSS only); internal `packages/config-typescript`, `packages/config-vitest`; apps `apps/demo-vite` (Vite demo + Playwright e2e in `apps/demo-vite/e2e/`), `apps/docs` (Next 16 + fumadocs).

## Commands you will need

| Purpose      | Command                            | Expected on success       |
| ------------ | ---------------------------------- | ------------------------- |
| Install      | `pnpm install`                     | exit 0                    |
| Lint         | `pnpm lint`                        | exit 0                    |
| Typecheck    | `pnpm typecheck`                   | exit 0                    |
| Tests        | `pnpm test`                        | exit 0, all suites pass   |
| Build        | `pnpm build`                       | exit 0                    |
| Format check | `pnpm format:check`                | exit 0                    |
| E2E          | `pnpm --filter demo-vite test:e2e` | all Playwright tests pass |

## Scope

**In scope** (the only files you should modify/create):

- `CLAUDE.md` (create, repo root)
- `package.json` (repo root — one script added)
- `turbo.json` (one key removed)
- `README.md` (Scripts section additions only)

**Out of scope** (do NOT touch):

- `.github/workflows/*` — CI already runs the right steps; do not refactor it here.
- Any `packages/*` or `apps/*` source file.
- Remote-cache configuration (Vercel/TURBO_TOKEN) — deliberately deferred.

## Git workflow

- Branch: work directly on the current feature branch if instructed, else `advisor/001-agent-onboarding`.
- Commit style (match `git log`): `chore: add repo CLAUDE.md, verify script, and turbo test caching`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `CLAUDE.md` at the repo root

Write the file with exactly this structure (verify each claimed fact against the
repo as you write it — e.g. open `packages/config-vitest` to read the real
coverage thresholds before stating any number; if a fact doesn't hold, adjust
the text to reality rather than inventing):

```markdown
# dashfoo

Headless React docking-layout library (tabs, tabsets, splits, drag-dock).
pnpm + turbo monorepo. Node >= 24, pnpm 11.

## Layout

- `packages/core` — framework-free engine: zod schemas, pure reducer (structuredClone + normalize), xstate v5 machines, tree/geometry/history/serialize. Published, ESM-only.
- `packages/react` — `@dashfoo/react`: DashfooLayout on react-resizable-panels v4 + @dnd-kit/dom (pinned 0.4.0, pre-1.0 — bump deliberately, the drag adapter is the only touch point). Published, ESM-only, "use client".
- `packages/theme` — plain-CSS theme. Published.
- `apps/demo-vite` — Vite + TanStack Router demo; Playwright e2e in `e2e/`.
- `apps/docs` — Next + fumadocs; `apps/docs/content/docs/*.mdx` is the canonical guide set. Package READMEs are the full API reference — update both when the API changes.

## Verify

- `pnpm verify` — lint + typecheck + test + build via turbo. Run before every handoff.
- E2E: one-time `pnpm --filter demo-vite exec playwright install --with-deps chromium`, then `pnpm --filter demo-vite test:e2e`.
- `pnpm format:check` (oxfmt) — CI-enforced via lint-staged on commit.

## Conventions

- TypeScript strict; arrow functions; `const` over `let`; `type` over `interface`; no `as any` — zod/type guards over assertions.
- camelCase vars/fns, PascalCase types/components, kebab-case files, MACRO_CASE constants; event handlers prefixed `handle`.
- Exports grouped at end of file. Max 400 lines/file — split into focused submodules when exceeded.
- Comments explain WHY, never WHAT. No silent failures — warn via `console.warn("[dashfoo] …")` on degraded paths.
- Releases via changesets: every user-visible change adds a `.changeset/*.md`. `pnpm version-packages` then `pnpm release`.

## Breaking-change policy

Pre-adoption: there are no external users yet. Breaking API/schema changes are
allowed freely — no deprecation shims, no migration machinery, no legacy
re-exports. Just change it, update docs/READMEs/changesets, and move on.

## Gotchas

- @dnd-kit DragDropManager must be created in a `useState` initializer and destroyed in a `useInsertionEffect` cleanup (NOT `useEffect`) — StrictMode double-fires effect cleanups and a destroyed manager silently stops emitting drag events. See `packages/react/src/components/drag-adapter.tsx`.
- react-resizable-panels v4 puts `aria-orientation` on the Separator and gives it no intrinsic size — themes must set width/height or the gutter collapses.
- rrp v4 fires `onLayoutChanged` once on mount with the measured layout; `row-view.tsx` deliberately ignores that first call.
- Drag is pointer-only by design (keyboard docking needs its own interaction model — see commit 8c9975b).
```

**Verify**: `test -f CLAUDE.md && head -3 CLAUDE.md` → file exists, starts with `# dashfoo`.

### Step 2: Add the verify script

In root `package.json` scripts, add (keep alphabetical-ish placement near `typecheck`):

```json
"verify": "turbo run lint typecheck test build",
```

**Verify**: `pnpm verify` → exit 0, all four tasks succeed.

### Step 3: Enable turbo caching for tests

In `turbo.json`, delete the `"cache": false` line from the `test` task (leave
`dependsOn` and `outputs` as they are).

**Verify**: run `pnpm test` twice in a row → the second run reports cache hits
(turbo prints `cached` per task and a `FULL TURBO` summary when everything hit).

### Step 4: Document the dev loop in README

In `README.md`'s Scripts/usage area, add (matching the surrounding prose/table
style):

- `pnpm dev` runs persistent watch mode for all packages and apps (tsdown
  `--watch` for packages, vite/next dev for apps); `pnpm --filter @dashfoo/react dev` watches one package.
- `pnpm verify` is the pre-push check (lint + typecheck + test + build).
- E2E: one-time `pnpm --filter demo-vite exec playwright install --with-deps chromium`, then `pnpm --filter demo-vite test:e2e`.

**Verify**: `grep -n "pnpm verify" README.md` → at least one hit; `pnpm format:check` → exit 0 (oxfmt accepts the edit; run `pnpm format` is NOT allowed — fix manually if check fails).

## Test plan

No new automated tests — this plan is config/docs. The verification gates above
(verify script runs green, second test run hits cache) are the test.

## Done criteria

- [ ] `test -f CLAUDE.md` → exists; content covers verify commands, conventions, breaking-change policy, gotchas
- [ ] `pnpm verify` → exit 0
- [ ] `grep -c '"cache": false' turbo.json` → the `test` task no longer has it (only `dev`/`clean`/`format:check`/`test:watch` may)
- [ ] Second consecutive `pnpm test` shows turbo cache hits
- [ ] `git status` shows only: `CLAUDE.md`, `package.json`, `turbo.json`, `README.md` (plus `plans/README.md` status update)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `pnpm verify` fails on a task that also fails on an untouched tree (pre-existing breakage — report, don't fix here).
- Re-running `pnpm test` with the cache enabled produces a DIFFERENT result than the uncached run (flaky/cache-unsafe tests — revert step 3 and report).
- A `CLAUDE.md` or `AGENTS.md` appears at the root before you start (someone else added one — reconcile, don't overwrite).

## Maintenance notes

- When coverage thresholds or commands change, CLAUDE.md is now the single place agents read — keep it in sync (it is small on purpose).
- Remote turbo caching (Vercel) was considered and deferred; revisit when CI time actually hurts.
- The dnd-kit pin rationale now lives in CLAUDE.md — when @dnd-kit/dom reaches 1.0, plan an upgrade pass over `drag-adapter.tsx`/`drag-hooks.tsx` only.

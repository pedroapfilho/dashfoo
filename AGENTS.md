# AGENTS.md

Guidance for AI coding agents working in `dashfoo`. `CLAUDE.md` is a symlink to this file.

## What this repo is

A **headless React docking-layout library** (tabs, tabsets, splits, drag-dock) — VS-Code-style dashboards. The layout is one serializable, zod-validated model; the engine ships structure (`data-dashfoo="..."` markup), not appearance. pnpm + turbo monorepo, Node ≥ 24, pnpm 11.

## Layout

- `packages/core` — framework-free engine: zod schemas, pure reducer (structuredClone + normalize), xstate v5 machines, tree/geometry/history/serialize. Published, ESM-only.
- `packages/react` — `@dashfoo/react`: DashfooLayout on react-resizable-panels v4 + @dnd-kit/dom (pinned 0.4.0, pre-1.0 — bump deliberately, the drag adapter is the only touch point). Published, ESM-only, "use client".
- `packages/theme` — plain-CSS theme. Published, changesets-ignored.
- `packages/config-typescript` + `packages/config-vitest` — `@repo/*` internal presets (tsconfig + vitest), never published or renamed.
- `apps/demo-vite` — Vite + TanStack Router demo; Playwright e2e in `e2e/`.
- `apps/docs` — Next + fumadocs at `https://dashfoo.docs.localhost` (portless); `apps/docs/content/docs/*.mdx` is the canonical guide set. Package READMEs are the full API reference — update both when the API changes.

## Verify

- `pnpm verify` — lint + typecheck + test + build via turbo. Run before every handoff.
- E2E: one-time `pnpm --filter demo-vite exec playwright install --with-deps chromium`, then `pnpm --filter demo-vite test:e2e` (Playwright boots its own Vite server on :5174).
- `pnpm format:check` (oxfmt) and `pnpm fallow:dead` — CI-enforced; pre-commit runs husky → lint-staged (oxlint + oxfmt).

## Conventions

- TypeScript strict; arrow functions; `const` over `let`; `type` over `interface`; no `as any` — zod/type guards over assertions.
- camelCase vars/fns, PascalCase types/components, kebab-case files, MACRO_CASE constants; event handlers prefixed `handle`.
- oxlint (`oxlint-config-awesomeness`) + oxfmt — no ESLint/Prettier.
- Exports grouped at end of file. Max 400 lines/file — split into focused submodules when exceeded.
- Comments explain WHY, never WHAT. No silent failures — warn via `console.warn("[dashfoo] …")` on degraded paths.
- Tab content never lives in the model — tabs carry a `component` registry key resolved at render.

## Breaking-change policy

Pre-adoption: there are no external users yet. Breaking API/schema changes are
allowed freely — no deprecation shims, no migration machinery, no legacy
re-exports. Just change it, update docs/READMEs/changesets, and move on.

## Publishable package contract

Every publishable package keeps the same shape:

- `exports: { ".": { types, default } }`, `files: ["dist"]`, `sideEffects: false`, `publishConfig.access: public`, MIT (`@dashfoo/theme` adds `./dashfoo.css` + `./tokens.css` exports and `sideEffects: ["*.css"]`)
- tsdown build: ESM-only, bundled `.d.ts`, source maps, tree-shaking
- `prepack`/`prepare` run the build; `typecheck` is `tsc --noEmit` against `@repo/typescript-config/{library,react-library}.json` and covers test files
- Tests: vitest via `@repo/config-vitest/{node,react}` — node for the core engine, jsdom for the React layer

## Publishing

Changesets: every user-visible change adds a `.changeset/*.md`; `release.yml` (changesets/action) opens the Version Packages PR and publishes with npm provenance. `@repo/*` packages stay `private: true` at version `0.0.0`; `@dashfoo/theme` is in the changesets `ignore` list.

## Gotchas

- @dnd-kit DragDropManager must be created in a `useState` initializer and destroyed in a `useInsertionEffect` cleanup (NOT `useEffect`) — StrictMode double-fires effect cleanups and a destroyed manager silently stops emitting drag events. See `packages/react/src/components/drag-adapter.tsx`.
- react-resizable-panels v4 puts `aria-orientation` on the Separator and gives it no intrinsic size — themes must set width/height or the gutter collapses.
- rrp v4 fires `onLayoutChanged` once on mount with the measured layout; `row-view.tsx` deliberately ignores that first call.
- Drag is pointer-only by design (keyboard docking needs its own interaction model — see commit 8c9975b).

## Notable decisions

- Primitives stay internal: `react-resizable-panels`, `@dnd-kit/dom` `0.4.0`, and XState are bundled dependencies behind adapters, never peers and never in the public API.
- The model is the single source of truth: plain JSON-serializable object, invariants self-heal after every action.
- Unlike the library template, this repo keeps Playwright e2e (extra `e2e.yml` workflow) — dnd-kit drag behavior is untestable in jsdom. `publish-checks.yml` adds typecheck + publint + @arethetypeswrong on the published packages.
- This repo follows the fleet's `library` profile (template: `~/dev/acme-package`, verified by `~/dev/orchestrator`).

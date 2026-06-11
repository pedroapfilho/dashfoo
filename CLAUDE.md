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

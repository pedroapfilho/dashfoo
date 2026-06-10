# AGENTS.md

Guidance for AI coding agents working in `dashfoo`. `CLAUDE.md` is a symlink to this file.

## What this repo is

A **headless React docking-layout library** — VS-Code-style dashboards: nested rows/columns of resizable panes, each pane a tabset you can restack, split, reorder, rename, close, and maximize by dragging. The layout is one serializable, zod-validated model; the engine ships structure (`data-dashfoo="..."` markup), not appearance. State lives in a single XState actor system and every document mutation runs through a pure reducer.

## Layout

```
packages/
  config-typescript/   @repo/typescript-config (tsconfig presets: base/library/react-library/vite/nextjs)
  config-vitest/       @repo/config-vitest (vitest presets: node/react + setup-react)
  core/                @dashfoo/core (publishable) — zod schema + derived types, pure reducer,
                       tree invariants, resolveDockTarget geometry, undo/redo history,
                       toJSON/fromJSON + migrations, XState machines. No React.
  react/               @dashfoo/react (publishable) — headless layer: DashfooLayout, Panel helper,
                       store binding (controlled/uncontrolled + undo/redo), persist prop +
                       persistence hooks, react-resizable-panels + @dnd-kit/dom adapters.
                       Peers: react/react-dom ^18.3.1 || ^19. Renders data-dashfoo markup, zero CSS.
  theme/               @dashfoo/theme (publishable, changesets-ignored) — opt-in CSS-only skin:
                       dashfoo.css over overridable --dashfoo-* tokens (tokens.css). No build step
                       for the CSS; tsdown builds only the tiny JS index.
apps/
  demo-vite/           Vite + TanStack Router/Query showcase consuming the packages via workspace:*.
                       Playwright e2e lives here (e2e/*.spec.ts) — real CDP pointer events, the only
                       reliable way to exercise dnd-kit's pointer sensor.
  docs/                Fumadocs on Next 16: https://dashfoo.docs.localhost (portless; URL set via
                       --name flag in apps/docs dev script)
docs/                  guides/ (model, drag, theming), adr/, superpowers/ (design spec)
```

## Dev workflow

Root scripts run turbo: `dev`, `build`, `test`, `test:coverage`, `lint`, `typecheck`, `clean`, `start`. Root-only: `format`/`format:check` (oxfmt), the `fallow*` suite, `changeset`/`version-packages`/`release`. Pre-commit runs husky → lint-staged (oxlint + oxfmt). E2E: `pnpm --filter demo-vite test:e2e` (Playwright boots its own Vite server on :5174).

## Publishable package contract

Every publishable package keeps the same shape:

- `exports: { ".": { types, default } }`, `files: ["dist"]`, `sideEffects: false`, `publishConfig.access: public`, MIT (`@dashfoo/theme` adds `./dashfoo.css` + `./tokens.css` exports and `sideEffects: ["*.css"]`)
- tsdown build: ESM-only, bundled `.d.ts`, source maps, tree-shaking
- `prepack`/`prepare` run the build; `typecheck` is `tsc --noEmit` against `@repo/typescript-config/{library,react-library}.json` and covers test files
- Tests: vitest via `@repo/config-vitest/{node,react}` — node for the core engine, jsdom for the React layer

## Publishing

Changesets. `release.yml` (changesets/action) opens the Version Packages PR and publishes with npm provenance. `@repo/*` packages stay `private: true` at version `0.0.0`. `@dashfoo/theme` is in the changesets `ignore` list — it is not auto-versioned.

## Conventions

- kebab-case filenames; oxlint (`oxlint-config-awesomeness`) + oxfmt; no ESLint/Prettier
- `type` over `interface`, arrow functions, exports at end, WHY-comments only
- Node ≥24, pnpm 11.1.3 (pinned `packageManager`)
- Tab content never lives in the model — tabs carry a `component` registry key resolved at render

## Notable decisions

- Primitives stay internal: `react-resizable-panels`, `@dnd-kit/dom` `0.4.0` (pinned, framework-agnostic core, no React bindings), and XState are bundled dependencies behind adapters, never peers and never in the public API.
- The model is the single source of truth: plain JSON-serializable object, invariants self-heal after every action (empty tabsets removed, single-child rows collapsed, indices clamped).
- Unlike the library template, this repo keeps Playwright e2e (extra `e2e.yml` workflow) — dnd-kit drag behavior is untestable in jsdom. `publish-checks.yml` adds typecheck + publint + @arethetypeswrong on the published packages.
- This repo follows the fleet's `library` profile (template: `~/dev/acme-package`, verified by `~/dev/orchestrator`).

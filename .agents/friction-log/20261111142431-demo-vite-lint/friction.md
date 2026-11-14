---
title: 'demo-vite lint skips e2e/, so pnpm verify passes specs the pre-commit hook rejects'
severity: 'minor'
issue: 'pedroapfilho/dashfoo#217'
---

### Expected Behavior

`pnpm verify` and the pre-commit hook lint the same files, so a change that passes `pnpm verify` also passes the hook.

### Current Behavior

`apps/demo-vite` lints with `oxlint src`, so `pnpm verify` (and CI lint) never sees `apps/demo-vite/e2e/*.spec.ts`. lint-staged lints every staged file, so a new e2e spec that passed `pnpm verify` failed the pre-commit hook on `anti-slop(require-readable-spacing)`.

### Possible Solution

Change the demo-vite lint script to `oxlint src e2e`.

### Minimal Reproducible Example

Add two statements with no blank line between them to any `apps/demo-vite/e2e/*.spec.ts`, run `pnpm verify` (passes), then stage it and run `git commit` (fails).

### Context

Hit while adding `apps/demo-vite/e2e/edge-dock.spec.ts` for the tabset drag and drop PR.

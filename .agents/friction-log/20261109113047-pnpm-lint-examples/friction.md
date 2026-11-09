---
title: '`pnpm lint:examples` runs in `pnpm verify` but in no CI job'
severity: 'minor'
---

### Expected Behavior

A lint rule change that breaks `pnpm verify` fails a CI check on the PR that introduces it.

### Current Behavior

`pnpm verify` ends with `pnpm lint:launch`, which runs `oxlint scripts/launch` and `pnpm lint:examples` against `examples/` with its own config. No workflow runs either script. The root `oxlint .` step in `lint.yml` ignores `examples/**` (`oxlint.config.ts`), so #203 (oxlint-config-awesomeness 4.9.0, `anti-slop/require-readable-spacing`) merged green while `pnpm verify` on `main` failed with six spacing errors in `examples/next` and `examples/vite`.

### Possible Solution

Run `pnpm lint:launch` as a step in `lint.yml`, next to the root oxlint step.

### Minimal Reproducible Example

On `2492dda`, run `pnpm lint:examples`: six `anti-slop(require-readable-spacing)` errors. Every check on #203 passed.

### Context

Found while validating the friction-log sync PR #198. The spacing fix landed on that branch so `pnpm verify` passes again.

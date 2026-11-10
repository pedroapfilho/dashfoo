---
title: 'Pre-commit hook rejects commits whose only staged scripts are under `examples/`'
severity: 'minor'
issue: 'pedroapfilho/dashfoo#206'
---

### Expected Behavior

A commit that only changes `examples/` sources passes the pre-commit hook once `pnpm lint:examples` and `pnpm format:check` pass.

### Current Behavior

lint-staged hands the staged `examples/**/*.tsx` paths to root `oxlint`. `oxlint.config.ts` ignores `examples/**`, so oxlint exits with `No files found to lint. Please check your paths and ignore patterns.` and the commit fails. Adding `--no-error-on-unmatched-pattern` to the lint-staged commands fixes the hook, but standy's `tooling/lint-staged-runs-oxlint` and `tooling/lint-staged-runs-oxfmt` require the commands to be exactly `oxlint` and `oxfmt`, so that fix fails `standy check`.

### Possible Solution

Let the standy rules accept `oxlint --no-error-on-unmatched-pattern` and `oxfmt --no-error-on-unmatched-pattern`, then use those in lint-staged. That also covers the oxfmt case in #197.

### Minimal Reproducible Example

Add a blank line to `examples/vite/src/main.tsx`, stage only that file, and run `git commit`.

### Context

Hit while committing the `lint:examples` spacing fix on the friction-log sync PR #198. The commit used `--no-verify` after running the hook's checks by hand.

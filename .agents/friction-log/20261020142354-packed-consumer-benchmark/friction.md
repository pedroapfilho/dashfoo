---
title: 'Packed-consumer benchmark factory fails strict typechecking'
severity: 'minor'
issue: 'pedroapfilho/dashfoo#196'
---

### Expected Behavior

`pnpm test:consumers` should compile the benchmark fixture and continue through the Next.js consumer.

### Current Behavior

The React 19 Vite benchmark build stops at `src/main.tsx(42,21): error TS7006: Parameter 'node' implicitly has an 'any' type`. The fixture is copied from `scripts/launch/workload.tsx.fixture`, whose factory parameter has no explicit type. That source line also exists at the implementation base.

### Possible Solution

Annotate the factory parameter with the public `TabNode` type. The remediation branch includes this fix.

### Minimal Reproducible Example

Run `pnpm install --frozen-lockfile`, `pnpm build`, then `pnpm test:consumers`. The normal React 18/19 browser checks pass before the benchmark fails to compile.

### Context

Encountered while validating the document-ownership and drop-permission fixes against packed packages. This blocked the remaining benchmark and Next.js consumer checks.

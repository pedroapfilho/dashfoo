---
title: 'demo-vite e2e reuses whatever server holds port 5174, even from another worktree'
severity: 'minor'
---

### Expected Behavior

`pnpm --filter demo-vite test:e2e` tests the code in the checkout it runs from.

### Current Behavior

`apps/demo-vite/playwright.config.ts` pins port 5174 and sets `reuseExistingServer: !process.env.CI`. With parallel worktrees, a Vite server another checkout left running answers on 5174, so the suite runs against that checkout's code and passes or fails for the wrong reasons. If that server stops mid-run, every test fails with `ERR_CONNECTION_REFUSED`.

### Possible Solution

Pick a free port per run, or reuse only a server started from this checkout.

### Minimal Reproducible Example

Start `pnpm --filter demo-vite test:e2e` in worktree A and leave its server up, then run the same command in worktree B. B's tests hit A's server.

### Context

Workaround: `E2E_PORT=<free port> pnpm --filter demo-vite test:e2e`.

---
title: "Vercel cannot package cached Next landing traces across pnpm installs"
severity: "major"
---

### Minimal reproduction

On Vercel, restore a Turbo landing build produced against a different cached pnpm dependency install. Deployments dpl_65cK3SxbMctUqUPakkNJS6XRAx6E and dpl_3LkazNVuXd76BGqojQsUizzRY1ry failed this way. The same release commit succeeded with a landing cache miss in dpl_2N84B3xnA66NSu8mtyN4jtgy9aw7.

### Expected and actual behavior

Expected: Vercel packages the landing build. Actual: packaging fails with ENOENT for node_modules/.pnpm/node_modules/@shikijs/core after a full Turbo cache hit. Disable artifact caching for the landing build so Next traces the current install; package builds remain cached.

### Dashfoo, React, browser, and OS versions

Dashfoo commit b23e2cf0061a1745294fc23da5dca3149d7a51ea; Next 16.3.4; React 19.3; pnpm 11.13.1; Turbo 2.10.12; Vercel Linux build, CLI 59.16.0. Browser is not involved.

# Contributing to dashfoo

Use GitHub Issues for bugs, questions, and feature proposals. For larger changes,
explain the user problem and proposed API before opening a pull request.

Use Node 24+ and pnpm 11. Run `pnpm install`, then `pnpm dev` to work on the demo,
docs, and landing page. See AGENTS.md for the package boundaries and conventions.

Before a pull request, run:

```sh
pnpm verify
pnpm format:check
pnpm fallow:dead
pnpm --filter demo-vite exec playwright install chromium firefox webkit
pnpm --filter demo-vite test:e2e
pnpm --filter docs test:e2e
pnpm test:sites
pnpm test:consumers
```

Add a regression test for behavior fixes. Changes to dragging need browser tests;
jsdom cannot verify pointer collision behavior. Update the canonical guide and
package README when changing a public API, default, or markup contract. Add a
changeset for each user-visible package change, including theme changes.

The code is MIT-licensed. Contributions are made under that same license.

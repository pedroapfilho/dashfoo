---
"@dashfoo/core": major
"@dashfoo/react": minor
---

Each package's entry point lists what it exports, and what only the React layer uses moves behind `@dashfoo/core/internal`.

Breaking in `@dashfoo/core`:

- These are no longer exported from `@dashfoo/core`. Import them from `@dashfoo/core/internal`: `dragDockMachine`, `dropAction`, `DragState`, `DropResolution`, `resolveSnapGrid`, `decideSnap`, `settleSnap`, `snapEnabled`, `SnapGrid`, `SnapDecision`, `canCollapseTabset`, `fallbackSelectedIndex`, `warn`, `warnOnce`.

  ```diff
  - import { dragDockMachine, warn } from "@dashfoo/core";
  + import { dragDockMachine, warn } from "@dashfoo/core/internal";
  ```

- `@dashfoo/core/internal` carries no semver promise: its exports can change in any release. A package that imports it should pin `@dashfoo/core` to an exact version, as `@dashfoo/react` does. Applications have no reason to import it.
- Everything else `@dashfoo/core` exported is still exported under the same name.

Breaking in `@dashfoo/react`:

- `useTabset` no longer exposes `pendingCloseTabId`, `registerRenameInput`, `registerTablist`, `renameInputCount` and `tablistElement`. They were the store's own bookkeeping for `Tabset.Tablist` and `Tabset.RenameInput`; compose those parts instead of calling them.
- `useLayout` no longer exposes `tablistSpace`, the registry object. Read a tabset's space with `useTabset((state) => state.tablistSpace)`, or pass your own `createTablistSpace()` to `Layout.Root`.
- Every other export of `@dashfoo/react` keeps its name and type.

---
"@dashfoo/core": major
"@dashfoo/react": minor
---

One responsive projection. `useResponsiveLayout(model, { maxWidth, orientation? })` measures the layout's own container and returns the compact view of the model plus the lock that goes with it (`restructurable: false`, which also disables floating, and `maximizable: false`). `DashfooLayout`'s `responsive` prop runs on the same hook, so a hand-built `Layout.Root` compacts exactly like the built-in layout, keeping row ancestors so nested widget state survives the breakpoint.

Breaking: `useResponsiveModel`, `useContainerWidth`, `matchBreakpoint`, `activeBreakpoint` and the `Breakpoint`, `ResponsiveModel` and `UseResponsiveModelOptions` types are removed from `@dashfoo/react`, and `stackModel` is removed from `@dashfoo/core`. Flattening reparented nested tabsets and remounted their content; use `useResponsiveLayout` instead.

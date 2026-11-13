---
title: 'shadcn no-inline-styles forces the float''s CSS variables to be named in two files'
severity: 'minor'
---

### Expected Behavior

The float's geometry custom properties (`--dashfoo-float-height`, `-left`, `-top`, `-width`) are named in one place, `floatGeometryStyle` in `packages/react/src/float/float-geometry.ts`, and both the panel's first render and the gesture's imperative writes use it.

### Current Behavior

`packages/react/src/float/float-panel.tsx` has to spell the four names again in a literal `style` object. Building the object from `floatGeometryStyle(node.geometry)` fails lint: `shadcn(no-inline-styles): Dynamic style object cannot be checked. Build it from CSS custom properties only.` So the two lists must be kept in step by hand, and only the comment on `FloatGesture` in `use-float-gesture.ts` says so.

### Possible Solution

Let `@shadcn/lint`'s `no-inline-styles` accept a spread of a function whose return type has only `--*` keys, or allow this one call by name in the lint config, which the standard owns.

### Minimal Reproducible Example

In `float-panel.tsx`, replace the four `--dashfoo-float-*` entries of `frameStyle` with `...floatGeometryStyle(node.geometry)` and run `pnpm oxlint .`.

### Context

Hit while moving the DOM contract into one module (PR 231). The untangle audit listed the duplicate as a fix; the lint rule is why it stayed.

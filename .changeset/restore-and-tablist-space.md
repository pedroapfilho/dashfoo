---
"@dashfoo/core": minor
"@dashfoo/react": minor
---

Saved layouts, tablist space, gutters and zoom.

- `@dashfoo/core`: new `restoreModel(value, { mapTab })` for saved layouts. It returns `null` and warns instead of throwing when the value is not a model, and `mapTab` upgrades or drops each saved tab (floats included) before the model is normalized. The selected tab stays selected when tabs before it are dropped.
- `persist` loads through `restoreModel` and takes the same `mapTab` option, so layouts saved by an older version of an app still restore after a component is renamed or removed.
- Each tabset measures the free space in its tablist (negative once the tabs overflow, still falling once the strip itself overflows), before paint: `useTabset((state) => state.tablistSpace)`, the `--dashfoo-tablist-space` custom property on the tablist, and `getTablistSpace` / `onTablistSpaceChange` on `DashfooHandle`. `Layout.Root` takes a `tablistSpace` from the new `createTablistSpace()` for hand-built layouts.
- `keepMounted="activity"` keeps inactive tabs in a hidden React `<Activity>`: state survives, effects pause. Needs React 19.2; older React keeps them mounted and warns.
- Nested rows count the splitter and any CSS `gap` between tabsets toward their minimum size, so a nested split no longer squeezes its tabsets below `tabSetMinSize`.
- Split and float resizing follow the pointer under CSS `zoom` or a scale transform, and a new float opens inside a scaled layout instead of partly outside it (the float overlay is now always rendered, so placement uses its coordinates). Splits no longer drift by a fraction of a pixel with fractional sizes, e.g. at 150% display scaling.

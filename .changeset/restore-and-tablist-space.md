---
"@dashfoo/core": minor
"@dashfoo/react": minor
---

Saved layouts, tablist space, gutters and zoom, after react-resizable-panels 4.15 to 4.21.

- `@dashfoo/core`: new `restoreModel(value, { mapTab })` for saved layouts. It returns `null` and warns instead of throwing when the value is not a model, and `mapTab` upgrades or drops each saved tab (floats included) before the model is normalized. The selected tab stays selected when tabs before it are dropped.
- `persist` loads through `restoreModel` and takes the same `mapTab` option, so layouts saved by an older version of an app still restore after a component is renamed or removed.
- Each tabset measures the free space in its tablist (negative once the tabs overflow, still falling once the strip itself overflows), before paint: `useTabset((state) => state.tablistSpace)`, the `--dashfoo-tablist-space` custom property on the tablist, and `getTablistSpace` / `onTablistSpaceChange` on `DashfooHandle`. `Layout.Root` takes a `tablistSpace` from the new `createTablistSpace()` for hand-built layouts.
- `keepMounted="activity"` keeps inactive tabs in a hidden React `<Activity>`: state survives, effects pause. Needs React 19.2; older React keeps them mounted and warns.
- Nested rows count the splitter and any CSS `gap` between tabsets toward their minimum size, so a nested split no longer squeezes its tabsets below `tabSetMinSize`.
- Float drag and resize follow the pointer under CSS `zoom` or a scale transform. Splits get the same fix, plus no fractional pixel drift at 150% display scaling, from react-resizable-panels 4.21.

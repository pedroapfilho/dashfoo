---
"@dashfoo/react": minor
---

One options contract for every layout. `LayoutOptions` (now exported) holds the capability props, `keepMounted` and `snap`, and `Layout.Root` resolves every default in one place. `DashfooLayout` takes the same options, `restructurable` included, and passes them through.

Breaking:

- `useResponsiveLayout` returns `locks` instead of `maximizable` and `restructurable`. Spread it onto `Layout.Root` after your own options: `<Layout.Root {...options} {...responsive.locks} … />`.
- `Layout.Rows` renders only the maximized tabset while one is maximized, so hand-built layouts drop their own maximize branch.
- `useTab()` also returns `closable`, `renamable` and `draggable`, which combine the layout, tabset and tab flags. Custom tab parts should read these: `tabsClosable` and `tabsRenamable` ignore a tab's own `enableClose` and `enableRename`.
- In `TabsetState`, `cancelRename` is now `stopEditing`, and `commitRename` is gone. Call `stopEditing`, then `renameTab`. `Tabset.RenameInput` already trims the name and skips empty or unchanged ones.

Added:

- Tabset roots carry `data-tabset-id`.
- `useDropIndicator()` returns the insertion line or split zone the built-in indicator draws, so a custom indicator draws the same thing.
- `measureTabset(id, element)` is exported. It is the measurement drops are resolved against, so a zone map built with `resolveDropIntent` matches the library.

Fixed:

- Without `keepMounted`, switching between two tabs that render the same component remounts it. Before, the second tab inherited the first one's component state.
- The tab overflow menu also updates when a tab's label changes width, not only when the strip resizes.
- The responsive hook re-renders only when the layout crosses `maxWidth`, and measures nothing without `responsive`. Before, every resize frame re-rendered the whole layout.
- A minimized float's chip is clamped at its rendered size; it used to assume 168×34.
- The float button caps a lifted tabset at the default float size of 480×360. It was 480×340, so the button and `floatTab` disagreed.
- A press on the float title bar's buttons or rename input never starts a move. Tab drags already used this rule.
- A `ref` passed to `Layout.Root` is a type error instead of being silently dropped; use `rootRef`.
- A tab whose component is not registered warns once, whether or not `components` was passed.
- Floats no longer render a second `[data-dashfoo="layout"]` inside their body, so rules written for the layout root stop applying to every float.
- The dock indicator renders the rect the drop was resolved with instead of measuring the tabset again on every frame.
- The overflow menu's icon carries `data-dashfoo="icon"` like the other built-in icons.

Structural CSS:

- The float is a flex column.
- The chip's clamp reads `--dashfoo-chip-width` and `--dashfoo-chip-height`.
- The drag preview ignores the pointer.
- The dock indicator's z-index inside a float is set in CSS, not inline.

`localStorageAdapter` no longer catches its own errors. The persistence loop catches and warns, as it does for any adapter.

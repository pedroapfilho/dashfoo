# @dashfoo/theme

A drop-in skin for the `@dashfoo/react` headless docking components.

This package is a **placeholder today**. It ships one export and no styles. The
real theme lands in Phase 7: a Base-UI-composed skin over the `data-dashfoo`
markup that `@dashfoo/react` renders. Until then, copy the demo's neutral theme
(see below) as your starting skin.

## What ships today

```ts
import { DASHFOO_THEME_VERSION } from "@dashfoo/theme";

console.log(DASHFOO_THEME_VERSION); // "0.0.0"
```

That constant is the entire public API. It keeps the `tsdown` build entry valid
while the skin is still being built. There are no components, no token files,
and no CSS imports yet. Importing this package will not style anything.

## Why it's empty

`@dashfoo/react` renders headless markup. Every structural element carries a
`data-dashfoo="..."` attribute and zero imposed styling — no colors, no borders,
no spacing. You attach the look. That contract is what `@dashfoo/theme` will
target: a styled layer you opt into, composed with Base UI primitives, that you
can drop over the headless tree without rewriting your own CSS.

Shipping the skin later (rather than a half-styled one now) keeps the headless
contract stable and lets the demo prove out the selector surface first.

## The contract to style against

The skin styles elements by their `data-dashfoo` attribute. These are the values
the demo theme targets today:

| Selector                           | What it is                                     |
| ---------------------------------- | ---------------------------------------------- |
| `[data-dashfoo="layout"]`          | Root layout container                          |
| `[data-dashfoo="tabset"]`          | A tabbed region (the bordered surface card)    |
| `[data-dashfoo="tabstrip"]`        | Tab strip row: tablist plus trailing toolbar   |
| `[data-dashfoo="tablist"]`         | The list of tabs                               |
| `[data-dashfoo="tab-item"]`        | A single tab's wrapper (label plus close)      |
| `[data-dashfoo="tab"]`             | The tab button itself                          |
| `[data-dashfoo="tab-close"]`       | Close-tab control                              |
| `[data-dashfoo="tab-rename"]`      | Inline rename input                            |
| `[data-dashfoo="tabset-toolbar"]`  | Trailing toolbar in the strip                  |
| `[data-dashfoo="tabset-maximize"]` | Maximize-tabset control                        |
| `[data-dashfoo="tabcontent"]`      | Active tab's content area                      |
| `[data-separator]`                 | A resize splitter (carries `aria-orientation`) |

State reads off standard ARIA and data attributes, so you select against them
directly:

- `[data-dashfoo="tab"][aria-selected="true"]` — the active tab
- `[data-dashfoo="tabset-maximize"][aria-pressed="true"]` — a maximized tabset's toggle
- `[data-separator][aria-orientation="vertical"]` — a column resize handle (also `horizontal`)
- `:focus-visible` and `:focus-within` for focus rings

Dock-target indicators (shown while dragging) read three CSS custom properties
you can set on `:root`:

```css
:root {
  --dashfoo-dock-fill: rgba(255, 255, 255, 0.1);
  --dashfoo-dock-border: rgba(255, 255, 255, 0.4);
  --dashfoo-dock-line: rgba(255, 255, 255, 0.85);
}
```

## Reference skin: copy the demo theme

`apps/demo-vite/src/index.css` is a complete, neutral (grayscale) skin over the
full `data-dashfoo` surface. It is the canonical reference until `@dashfoo/theme`
ships. Selection, focus, and data direction read through lightness, weight, and
glyphs — no hue anywhere — so it drops into most apps without a palette fight.

It's written with Tailwind v4 `@apply` inside `@layer components`, but the
selectors are plain CSS. Lift them into vanilla CSS, CSS Modules, or another
utility framework as needed. A trimmed sample:

```css
[data-dashfoo="tabset"] {
  min-height: 0;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #161617;
}

[data-dashfoo="tabset"]:focus-within {
  border-color: rgba(255, 255, 255, 0.16);
}

[data-dashfoo="tab"][aria-selected="true"] {
  font-weight: 500;
  color: #fafafa;
}

[data-separator][aria-orientation="vertical"] {
  width: 1rem;
  cursor: col-resize;
}
```

To use it as-is:

1. Open `apps/demo-vite/src/index.css`.
2. Copy the `@theme` block (color and radius tokens), the `:root` block (the
   `--dashfoo-dock-*` indicator variables), and the `@layer components` block.
3. Paste into your app's stylesheet and adjust the token values.

The headless tree owns its structure; you own every pixel of the look.

## Roadmap

Phase 7 replaces this placeholder with:

- A Base-UI-composed component skin over the `@dashfoo/react` headless tree.
- Design tokens shipped separately as `./tokens.css`.

Until then, `@dashfoo/theme` exports `DASHFOO_THEME_VERSION` and nothing else.
Build your skin against the `data-dashfoo` contract above, using the demo CSS as
the reference.

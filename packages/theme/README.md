# @dashfoo/theme

The opt-in default skin for the `@dashfoo/react` headless docking chrome.

It styles every `data-dashfoo` element through overridable shadcn-style semantic
`--dashfoo-*` tokens, ships a neutral light theme by default, and an opt-in dark
variant. Import it and the layout is styled; remap a few tokens to make it yours.

Two artifacts, one source:

- **`@dashfoo/theme/tailwind.css`** — a Tailwind CSS v4 source entry. Import it
  into your Tailwind pipeline and you also get `dashfoo-*` utilities
  (`bg-dashfoo-card`, `rounded-dashfoo`, …) generated from the same tokens.
- **`@dashfoo/theme/dashfoo.css`** — a prebuilt plain-CSS file compiled from the
  same source at package build time. No Tailwind, no build step required.

## Install

```bash
pnpm add @dashfoo/theme
```

## Use

### With Tailwind CSS v4

Import the theme after `tailwindcss` in your CSS entry (Vite and Next/PostCSS
setups are identical):

```css
@import "tailwindcss";
@import "@dashfoo/theme/tailwind.css";
```

Tokens land in Tailwind's `theme` layer and the skin in the `components` layer,
so your own utilities and unlayered CSS override the skin without specificity
wars — import the theme before your own component-layer CSS.

The entry also bridges the tokens into `@theme`, generating utilities for your
own markup that stay in sync with the skin (including the dark remap — no
`dark:` variant needed):

| Tokens                                                    | Utilities                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `--dashfoo-background` … `--dashfoo-ring` (all 11 colors) | `bg-dashfoo-*`, `text-dashfoo-*`, `border-dashfoo-*`, `ring-dashfoo-*` |
| `--dashfoo-radius`, `--dashfoo-radius-sm`                 | `rounded-dashfoo`, `rounded-dashfoo-sm`                                |
| `--dashfoo-font`                                          | `font-dashfoo`                                                         |

> **Custom CSS should read `var(--dashfoo-*)`, never the `--color-dashfoo-*`
> mirrors.** The mirrors exist only to generate utilities; reading them directly
> resolves at `:root` and ignores subtree dark remaps.

### Without Tailwind

Import the prebuilt skin once, anywhere in your app's entry:

```ts
import "@dashfoo/theme/dashfoo.css";
```

That's it — the file is compiled from the same source as the Tailwind entry
(tokens included), so every `data-dashfoo` element from `@dashfoo/react` is
styled. The chrome is light neutral by default.

### Dark theme

Dark is opt-in. Set `data-dashfoo-theme="dark"` on any ancestor (typically
`<html>`); everything inside inverts:

```html
<html data-dashfoo-theme="dark"></html>
```

Scope it to a subtree instead by putting the attribute on a wrapping element.

Tailwind users who want their own `dark:` variants to key off the same
attribute can define a custom variant in their app CSS (the theme deliberately
doesn't ship one — your app owns the `dark` variant):

```css
@custom-variant dark (&:where([data-dashfoo-theme="dark"], [data-dashfoo-theme="dark"] *));
```

### Tokens only

Want the headless structure styled by your own rules but with the dashfoo token
palette available? Import just the tokens:

```ts
import "@dashfoo/theme/tokens.css";
```

## Customize

Every value in the skin resolves through a `--dashfoo-*` custom property.
Reskinning is a token remap — you never touch the chrome rules. Override on
`:root` (or any scope):

```css
:root {
  --dashfoo-background: #0b0f17;
  --dashfoo-card: #131a26;
  --dashfoo-foreground: #e8f0ff;
  --dashfoo-radius: 6px;
}
```

Tailwind apps can point tokens at their own palette the same way:

```css
:root {
  --dashfoo-primary: var(--color-blue-600);
  --dashfoo-ring: var(--color-blue-400);
}
```

### Token reference

These are defined in `tokens.css` and are the intended override surface. The
dark variant under `[data-dashfoo-theme="dark"]` remaps the same names with the
inverted neutral scale.

| Token                         | Default (light)                                                | Controls                                    |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| `--dashfoo-background`        | `oklch(1 0 0)`                                                 | Layout background                           |
| `--dashfoo-card`              | `oklch(1 0 0)`                                                 | Tabset + tab-content surface, selected tab  |
| `--dashfoo-popover`           | `oklch(1 0 0)`                                                 | Overflow menu + drag-preview surface        |
| `--dashfoo-muted`             | `oklch(0.97 0 0)`                                              | Tab strip + panel-badge background          |
| `--dashfoo-accent`            | `oklch(0.97 0 0)`                                              | Hover surface on controls + menu items      |
| `--dashfoo-foreground`        | `oklch(0.145 0 0)`                                             | Primary text, active tab                    |
| `--dashfoo-muted-foreground`  | `oklch(0.556 0 0)`                                             | Idle tabs, icons, secondary text            |
| `--dashfoo-accent-foreground` | `oklch(0.205 0 0)`                                             | Text on hovered controls + menu items       |
| `--dashfoo-primary`           | `oklch(0.205 0 0)`                                             | Active-tab underline, dock-indicator accent |
| `--dashfoo-border`            | `oklch(0.922 0 0)`                                             | Default borders                             |
| `--dashfoo-ring`              | `oklch(0.708 0 0)`                                             | Focus rings, rename input, splitter grip    |
| `--dashfoo-radius`            | `0.625rem`                                                     | Tabset / menu corner radius                 |
| `--dashfoo-font`              | `ui-sans-serif, system-ui, …`                                  | Chrome font family                          |
| `--dashfoo-font-size`         | `13px`                                                         | Base chrome font size                       |
| `--dashfoo-splitter-size`     | `1rem`                                                         | Resize-handle hit area (see note)           |
| `--dashfoo-dock-fill`         | `color-mix(in oklab, var(--dashfoo-primary) 10%, transparent)` | Split-zone fill while dragging              |
| `--dashfoo-dock-border`       | `var(--dashfoo-ring)`                                          | Split-zone border                           |
| `--dashfoo-dock-line`         | `var(--dashfoo-primary)`                                       | Tab insertion line                          |

The dock tokens are derived from the semantic tokens, so they track theme and
overrides automatically. When no theme CSS is loaded at all, `@dashfoo/react`
falls back inline to neutral values: `oklch(0.556 0 0 / 0.18)` fill,
`oklch(0.708 0 0 / 0.75)` border, `oklch(0.556 0 0)` line.

The drag/dock indicators also read four **optional** properties that are unset by
default (they fall back to the value shown). Override them only to retune the
indicator look:

| Token                         | Fallback                                       | Controls                               |
| ----------------------------- | ---------------------------------------------- | -------------------------------------- |
| `--dashfoo-dock-border-width` | `1px`                                          | Split-zone border width                |
| `--dashfoo-dock-radius`       | `6px`                                          | Split-zone corner radius               |
| `--dashfoo-dock-line-radius`  | `2px`                                          | Insertion-line corner radius           |
| `--dashfoo-dock-transition`   | `left 60ms, top 60ms, width 60ms, height 60ms` | Indicator glide; set `none` to disable |

> **Splitter size.** `--dashfoo-splitter-size` is the default; the model's
> `global.splitterSize` (a number, in px) overrides it per-layout via an inline
> CSS var on the layout root.

## The `data-dashfoo` contract

If you'd rather write your own skin, target these attributes — they're stable and
emitted by `@dashfoo/react` with zero imposed styling.

| Selector                             | Element                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `[data-dashfoo="layout"]`            | Root layout container                                                   |
| `[data-dashfoo="row"]`               | A resizable row/column group                                            |
| `[data-dashfoo="splitter"]`          | Resize handle (also carries rrp's `[data-separator][aria-orientation]`) |
| `[data-dashfoo="tabset"]`            | A tabbed pane (bordered surface)                                        |
| `[data-dashfoo="tabstrip"]`          | Tab strip row (tablist + trailing toolbar)                              |
| `[data-dashfoo="tablist"]`           | The ARIA tablist                                                        |
| `[data-dashfoo="tab-item"]`          | A tab wrapper (label + close)                                           |
| `[data-dashfoo="tab"]`               | The tab button                                                          |
| `[data-dashfoo="tab-close"]`         | Close-tab control                                                       |
| `[data-dashfoo="tab-rename"]`        | Inline rename input                                                     |
| `[data-dashfoo="tabset-toolbar"]`    | Trailing toolbar in the strip                                           |
| `[data-dashfoo="tabset-grip"]`       | Drag grip that moves the whole tabset                                   |
| `[data-dashfoo="tabset-maximize"]`   | Maximize/restore toggle                                                 |
| `[data-dashfoo="tabcontent"]`        | Active tab's content region                                             |
| `[data-dashfoo="tab-overflow"]`      | "More tabs" overflow button                                             |
| `[data-dashfoo="tab-overflow-root"]` | Overflow popper root                                                    |
| `[data-dashfoo="tab-overflow-menu"]` | Overflow dropdown menu                                                  |
| `[data-dashfoo="tab-overflow-item"]` | An overflow menu item                                                   |
| `[data-dashfoo="panel"]`             | `Panel` helper root                                                     |
| `[data-dashfoo="panel-header"]`      | `Panel` header row                                                      |
| `[data-dashfoo="panel-title"]`       | `Panel` title                                                           |
| `[data-dashfoo="panel-icon"]`        | `Panel` leading-icon slot                                               |
| `[data-dashfoo="panel-badge"]`       | `Panel` live badge                                                      |
| `[data-dashfoo="panel-body"]`        | `Panel` scrollable body                                                 |
| `[data-dashfoo="dock-indicator"]`    | Live dock indicator (insertion line / split zone)                       |
| `[data-dashfoo="drag-preview"]`      | The chip that follows the pointer while dragging                        |

### State selectors

Read state off standard ARIA and data attributes:

- `[data-dashfoo="tab"][aria-selected="true"]` — the active tab
- `[data-dashfoo="tabset-maximize"][aria-pressed="true"]` — a maximized tabset's toggle
- `[data-dashfoo="tab-item"][data-dragging]` — a tab being lifted into the drag preview (the source, dimmed)
- `[data-dashfoo="tabset"][data-dragging-source]` — a tabset being dragged by its grip
- `[data-dashfoo="tabset"][data-tab-location="bottom"]` — a tabset with its strip on the bottom
- `[data-separator][aria-orientation="vertical"]` — a column resize handle (also `horizontal`)
- `:focus-visible` / `:focus-within` for focus rings

## Notes

- **Tab labels live in the model, not the content.** The `Panel` helper and tab
  chrome are styled here; the panel _content_ is yours.
- **No JS API.** The package exports a `DASHFOO_THEME_VERSION` constant for
  tooling; everything else is CSS. There are no React components to import.
- **Reduced motion** is honored: `@media (prefers-reduced-motion: reduce)` drops
  the dock-indicator glide.

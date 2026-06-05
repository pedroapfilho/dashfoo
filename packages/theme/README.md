# @dashfoo/theme

The opt-in default skin for the `@dashfoo/react` headless docking chrome.

Framework-agnostic **plain CSS** — no Tailwind, no Base UI, no build step. It
styles every `data-dashfoo` element through overridable `--dashfoo-*` design
tokens, ships a neutral grayscale dark theme by default, and an opt-in light
variant. Import it and the layout is styled; remap a few tokens to make it yours.

## Install

```bash
pnpm add @dashfoo/theme
```

## Use

Import the full skin once, anywhere in your app's entry:

```ts
import "@dashfoo/theme/dashfoo.css";
```

That's it — `dashfoo.css` already `@import`s the tokens, so every `data-dashfoo`
element from `@dashfoo/react` is styled. The chrome is dark grayscale by default.

### Light theme

Light is opt-in. Set `data-dashfoo-theme="light"` on any ancestor (typically
`<html>`); everything inside inverts:

```html
<html data-dashfoo-theme="light"></html>
```

Scope it to a subtree instead by putting the attribute on a wrapping element.

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
  --dashfoo-bg: #0b0f17;
  --dashfoo-surface: #131a26;
  --dashfoo-text-emphasis: #e8f0ff;
  --dashfoo-radius: 6px;
}
```

### Token reference

These are defined in `tokens.css` and are the intended override surface.

| Token                     | Default (dark)                | Controls                             |
| ------------------------- | ----------------------------- | ------------------------------------ |
| `--dashfoo-bg`            | `#0a0a0b`                     | Layout background                    |
| `--dashfoo-surface`       | `#161617`                     | Tabset + panel + tab-content surface |
| `--dashfoo-strip`         | `#101011`                     | Tab strip background                 |
| `--dashfoo-border`        | `rgba(255,255,255,0.08)`      | Default borders                      |
| `--dashfoo-border-strong` | `rgba(255,255,255,0.16)`      | Focused / emphasized borders         |
| `--dashfoo-text`          | `#ededee`                     | Primary text                         |
| `--dashfoo-text-muted`    | `#8b8b8f`                     | Idle tabs, secondary text            |
| `--dashfoo-text-faint`    | `#5f5f63`                     | Icons, close/grip/maximize controls  |
| `--dashfoo-text-emphasis` | `#fafafa`                     | Active tab, focus ring, selection    |
| `--dashfoo-radius`        | `10px`                        | Tabset / menu corner radius          |
| `--dashfoo-font`          | `ui-sans-serif, system-ui, …` | Chrome font family                   |
| `--dashfoo-font-size`     | `13px`                        | Base chrome font size                |
| `--dashfoo-splitter-size` | `1rem`                        | Resize-handle hit area (see note)    |
| `--dashfoo-dock-fill`     | `rgba(255,255,255,0.1)`       | Split-zone fill while dragging       |
| `--dashfoo-dock-border`   | `rgba(255,255,255,0.4)`       | Split-zone border                    |
| `--dashfoo-dock-line`     | `rgba(255,255,255,0.85)`      | Tab insertion line                   |

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

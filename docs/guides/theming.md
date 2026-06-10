# Theming the headless chrome

`@dashfoo/react` renders the dock as plain DOM with zero imposed styling. No
class names, no inline colors, no default border on a tabset. Every structural
element instead carries a `data-dashfoo="..."` attribute (and the resize
splitters carry `data-separator` from react-resizable-panels). You style a skin
by selecting on those attributes.

You have two paths:

1. **Import the default skin.** `@dashfoo/theme` ships a complete, framework-agnostic
   plain-CSS skin over overridable `--dashfoo-*` tokens, light by default with an
   opt-in dark variant. Most apps want this — see the
   [@dashfoo/theme README](../../packages/theme/README.md) for tokens and usage.

   ```ts
   import "@dashfoo/theme/dashfoo.css";
   ```

2. **Write your own.** Select on the `data-dashfoo` attributes from a regular CSS
   file. No theme provider, no style props, no runtime config. This guide is the
   full attribute + state + token contract you'd target.

The examples below are plain CSS. If your app uses Tailwind you can `@apply`
equivalents — the selectors are the same either way. The canonical worked skin is
[`packages/theme/dashfoo.css`](../../packages/theme/dashfoo.css).

## Why attributes instead of class names

Two reasons drive the choice.

1. **Nothing to override.** A library that ships default styles forces you into
   specificity wars or `!important` to undo them. dashfoo ships none, so your
   first rule is also the only rule that matches.

2. **Stable selectors.** Class names churn across versions and get mangled by
   CSS-in-JS. The `data-dashfoo` values are part of the public contract: they
   change with a major version, not a refactor. Select on them the same way you
   would select on `role` or `aria-*`.

The shipped theme leans into this. It is one flat block of attribute selectors in
plain CSS, every value resolving through a `--dashfoo-*` token:

```css
[data-dashfoo="layout"] {
  background: var(--dashfoo-background);
  color: var(--dashfoo-foreground);
  font-family: var(--dashfoo-font);
}
[data-dashfoo="tabset"] {
  flex: 1 1 0%;
  overflow: hidden;
  border: 1px solid var(--dashfoo-border);
  border-radius: var(--dashfoo-radius);
  background: var(--dashfoo-card);
}
/* ...one rule per attribute... */
```

Nothing here is dashfoo-specific machinery — the same selectors work in any CSS
dialect.

## Attribute reference

Every value of `data-dashfoo` the renderer emits, what element carries it, and
where it comes from. Read the right-hand column against the source files if you
want to confirm a selector before you write the rule.

| `data-dashfoo` value | Element                 | Role                                                                                           |
| -------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `layout`             | root `<div>`            | The whole frame. Also the geometry anchor for docking (`.closest('[data-dashfoo="layout"]')`). |
| `row`                | rrp `<Group>`           | A horizontal or vertical split container.                                                      |
| `tabset`             | `<div>`                 | One tiled region: a strip of tabs over a content panel.                                        |
| `tabstrip`           | `<div>`                 | The strip row: tablist plus trailing toolbar.                                                  |
| `tablist`            | `<div role="tablist">`  | The scrollable run of tabs.                                                                    |
| `tab-item`           | `<span>`                | One tab's group: the tab button and its close button.                                          |
| `tab`                | `<button role="tab">`   | The selectable tab itself.                                                                     |
| `tab-close`          | `<button>`              | Per-tab close control.                                                                         |
| `tab-rename`         | `<input>`               | Inline rename editor, mounted on double-click.                                                 |
| `tabset-toolbar`     | `<div>`                 | Trailing controls area in the strip.                                                           |
| `tabset-grip`        | `<button>`              | Drag grip that moves the whole tabset.                                                         |
| `tabset-maximize`    | `<button>`              | Maximize / restore toggle.                                                                     |
| `tabcontent`         | `<div role="tabpanel">` | The active tab's content panel.                                                                |
| `tab-overflow`       | `<button>`              | "More tabs" button when the strip overflows.                                                   |
| `tab-overflow-root`  | `<div>`                 | Popper root for the overflow menu.                                                             |
| `tab-overflow-menu`  | `<div>`                 | The overflow dropdown.                                                                         |
| `tab-overflow-item`  | `<button>`              | One tab inside the overflow dropdown.                                                          |
| `panel`              | `<div>`                 | `Panel.Root` shell.                                                                            |
| `panel-header`       | `<div>`                 | `Panel.Header` row.                                                                            |
| `panel-title`        | `<span>`                | `Panel.Title` text.                                                                            |
| `panel-icon`         | `<span>`                | `Panel.Icon` leading slot.                                                                     |
| `panel-badge`        | `<span>`                | `Panel.Badge` trailing slot.                                                                   |
| `panel-body`         | `<div>`                 | `Panel.Body` scrollable content.                                                               |
| `dock-indicator`     | `<div>`                 | The drag overlay: insertion line or drop-zone pane.                                            |
| `drag-preview`       | `<div>`                 | The chip that follows the pointer while dragging a tab/tabset.                                 |
| `splitter`           | rrp `<Separator>`       | The resize handle between panels. Also matchable as `[data-separator]`.                        |

A few of these warrant detail.

### Tabset structure

A tabset nests four levels deep. The skin styles each separately so the strip,
the tabs, and the content panel can have different surfaces.

```html
<div data-dashfoo="tabset">
  <div data-dashfoo="tabstrip">
    <div data-dashfoo="tablist" role="tablist">
      <span data-dashfoo="tab-item">
        <button data-dashfoo="tab" role="tab" aria-selected="true">Editor</button>
        <button data-dashfoo="tab-close" aria-label="Close Editor">…</button>
      </span>
    </div>
    <div data-dashfoo="tabset-toolbar">
      <button data-dashfoo="tabset-maximize" aria-pressed="false">…</button>
    </div>
  </div>
  <div data-dashfoo="tabcontent" role="tabpanel">…</div>
</div>
```

The shipped theme treats the tabset as a card and the strip as its header:

```css
[data-dashfoo="tabset"] {
  overflow: hidden;
  background: var(--dashfoo-card);
  border: 1px solid var(--dashfoo-border);
  border-radius: var(--dashfoo-radius);
}
[data-dashfoo="tabstrip"] {
  background: var(--dashfoo-muted);
  border-bottom: 1px solid var(--dashfoo-border);
}
[data-dashfoo="tabcontent"] {
  background: var(--dashfoo-card);
}
```

### The `tab-rename` input

There is no rename mode you opt a class into. When a renamable tab is
double-clicked, the `tab` button is swapped for an `<input data-dashfoo="tab-rename">`
in place. Style it as a normal text field; it focuses and selects itself on
mount, commits on Enter or blur, and cancels on Escape.

```css
[data-dashfoo="tab-rename"] {
  width: 6rem;
  padding: 0.25rem 0.5rem;
  background: var(--dashfoo-background);
  border: 1px solid var(--dashfoo-ring);
  border-radius: 2px;
  color: var(--dashfoo-foreground);
  outline: none;
}
```

## State hooks

State does not arrive as extra `data-dashfoo` values. It rides on the native
ARIA and `data-*` attributes the elements already set, so your selectors compose
the structural attribute with the state attribute.

| State                  | Lives on                           | Set when                                                        |
| ---------------------- | ---------------------------------- | --------------------------------------------------------------- |
| `aria-selected="true"` | `[data-dashfoo="tab"]`             | The tab is the active one in its tabset                         |
| `aria-pressed="true"`  | `[data-dashfoo="tabset-maximize"]` | The tabset is maximized                                         |
| `data-dragging`        | `[data-dashfoo="tab-item"]`        | This tab is being lifted into the drag preview (dim the source) |
| `data-dragging-source` | `[data-dashfoo="tabset"]`          | This whole tabset is being dragged by its grip                  |
| `data-tab-location`    | `[data-dashfoo="tabset"]`          | `"top"` (default) or `"bottom"` strip placement                 |
| `tabIndex={0 / -1}`    | `[data-dashfoo="tab"]`             | Roving tabindex: the selected tab is the one tab stop           |

The boolean `data-*` attributes (`data-dragging`, `data-dragging-source`) are
only present when true — set to `undefined` otherwise, so the attribute is absent
rather than `="false"`. Select on presence:

```css
[data-dashfoo="tab-item"][data-dragging] {
  opacity: 0.35;
}
[data-dashfoo="tabset"][data-dragging-source] {
  /* the tabset being dragged away by its grip — dim/dash it */
  border-style: dashed;
}
```

> There is no "drop target" attribute. Where a drop will land is shown by the
> single `[data-dashfoo="dock-indicator"]` overlay, not by a class on the target.

### Selected tab

The theme reads selection through `aria-selected` and adds a weight change plus an
underline pseudo-element. No color is used to carry the state on its own, which
keeps it legible without hue:

```css
[data-dashfoo="tab"] {
  cursor: pointer;
  background: transparent;
  border: 0;
  color: var(--dashfoo-muted-foreground);
}
[data-dashfoo="tab"][aria-selected="true"] {
  color: var(--dashfoo-foreground);
  font-weight: 500;
}
[data-dashfoo="tab-item"]:has([aria-selected="true"]) {
  background: var(--dashfoo-card);
}
[data-dashfoo="tab-item"]:has([aria-selected="true"])::after {
  content: "";
  position: absolute;
  inset-inline: 0.5rem;
  bottom: -1px;
  height: 2px;
  border-radius: 9999px;
  background: var(--dashfoo-primary);
}
```

The `:has()` rule is worth calling out. The active surface and the underline want
to sit on the `tab-item` wrapper, but the state lives on the inner `tab` button.
`:has()` lifts the state up one level without any extra attribute on the wrapper.

### Pressed maximize toggle

The maximize button reports its on/off state through `aria-pressed`. Give the
pressed toggle a visible surface, e.g. with the hover tokens:

```css
[data-dashfoo="tabset-maximize"][aria-pressed="true"] {
  background: var(--dashfoo-accent);
  color: var(--dashfoo-accent-foreground);
}
```

## The splitter

The resize handle is a react-resizable-panels `<Separator>`. It carries both
`data-dashfoo="splitter"` (dashfoo's hook) and `data-separator` with
`aria-orientation` set by rrp. Orientation lives on the separator itself, so you
read direction from the attribute rather than from the parent row.

| Selector                                          | Matches                                                 |
| ------------------------------------------------- | ------------------------------------------------------- |
| `[data-separator]`                                | Every splitter.                                         |
| `[data-separator][aria-orientation="vertical"]`   | Splitter between side-by-side panels (drag left/right). |
| `[data-separator][aria-orientation="horizontal"]` | Splitter between stacked panels (drag up/down).         |

The handle is invisible by default. The theme gives it a wide hit area with the
right cursor per orientation, then paints a thin pill with a `::before` so the
visual grip is narrower than the grab target:

```css
[data-separator] {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}
[data-separator][aria-orientation="vertical"] {
  width: var(--dashfoo-splitter-size);
  cursor: col-resize;
}
[data-separator][aria-orientation="horizontal"] {
  height: var(--dashfoo-splitter-size);
  cursor: row-resize;
}
[data-separator]::before {
  content: "";
  background: var(--dashfoo-ring);
  border-radius: 9999px;
}
[data-separator][aria-orientation="vertical"]::before {
  width: 2px;
  height: 2rem;
}
[data-separator][aria-orientation="horizontal"]::before {
  width: 2rem;
  height: 2px;
}
[data-separator]:hover::before {
  background: var(--dashfoo-foreground);
}
```

A 16px grab target around a 2px grip keeps resize easy to hit while the visible
line stays quiet. The hover rule raises contrast on the grip, not the whole
handle.

## Dock indicators and the `--dashfoo-dock-*` vars

The drag overlay is the one place dashfoo writes color inline, and only as a
fallback. While a tab is dragged, a single `data-dashfoo="dock-indicator"`
element is positioned over the frame. Its position and size are fixed inline (the
library computes them from geometry), but every visual property reads a CSS
custom property with a neutral fallback. Set the variables to own the look
without touching the element's selector.

| Variable                      | Default fallback                               | Controls                                                    |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| `--dashfoo-dock-fill`         | `oklch(0.556 0 0 / 0.18)`                      | Drop-zone pane background.                                  |
| `--dashfoo-dock-border`       | `oklch(0.708 0 0 / 0.75)`                      | Drop-zone pane border color.                                |
| `--dashfoo-dock-border-width` | `1px`                                          | Drop-zone pane border width.                                |
| `--dashfoo-dock-radius`       | `6px`                                          | Drop-zone pane corner radius.                               |
| `--dashfoo-dock-line`         | `oklch(0.556 0 0)`                             | Tab-strip insertion line color.                             |
| `--dashfoo-dock-line-radius`  | `2px`                                          | Insertion line corner radius.                               |
| `--dashfoo-dock-transition`   | `left 60ms, top 60ms, width 60ms, height 60ms` | Position glide; the theme sets `none` under reduced motion. |

The indicator takes two visual forms from the same element. Dropping onto a tab
strip paints a thin insertion line (`--dashfoo-dock-line`); dropping onto the tabset
body to split paints a filled pane (`--dashfoo-dock-fill` plus the border vars).
You do not select between them; setting the variables covers both.

The shipped theme derives the three color vars from its semantic tokens, so the
indicators follow the light and dark palettes automatically:

```css
:root {
  --dashfoo-dock-fill: color-mix(in oklab, var(--dashfoo-primary) 10%, transparent);
  --dashfoo-dock-border: var(--dashfoo-ring);
  --dashfoo-dock-line: var(--dashfoo-primary);
}
```

If you want the indicator to follow your accent color, point these at your own
tokens:

```css
:root {
  --dashfoo-dock-fill: color-mix(in oklab, var(--accent) 18%, transparent);
  --dashfoo-dock-border: var(--accent);
  --dashfoo-dock-line: var(--accent);
}
```

You can still select `[data-dashfoo="dock-indicator"]` directly for properties
the vars do not cover, such as `box-shadow`. The inline `left/top/width/height`
are owned by the library; leave those alone or the indicator will not track the
pointer.

## Focus and hit targets

The renderer wires the keyboard model (roving tabindex on the tablist, arrow keys
to move selection, Home/End to jump). The skin owns the visible focus ring. The
theme draws the tab's ring on the `tab-item` wrapper as an inset box-shadow, so
it wraps the label plus close button without clipping against the tabset's
`overflow: hidden` edge; the icon controls take a plain outline:

```css
[data-dashfoo="tab"]:focus-visible {
  outline: none;
}
[data-dashfoo="tab-item"]:has([data-dashfoo="tab"]:focus-visible) {
  border-radius: 0.375rem;
  box-shadow: inset 0 0 0 2px var(--dashfoo-ring);
}
[data-dashfoo="tab-close"]:focus-visible {
  outline: 2px solid var(--dashfoo-ring);
}
[data-dashfoo="tabset-maximize"]:focus-visible {
  outline: 2px solid var(--dashfoo-ring);
}
```

Mind hit-target sizes on the icon controls. The theme gives `tab-close` a 16px box
and `tabset-maximize` a 24px box. The close control sits inside a larger
`tab-item` hover zone, but on touch you may want to grow both to meet the 44px
target guidance.

## Design tokens and the dark theme

If you import `@dashfoo/theme`, you reskin by remapping the shadcn-style
`--dashfoo-*` tokens rather than rewriting rules. The surface, foreground,
border, radius, font, and splitter values are all tokens; the full table lives in the
[@dashfoo/theme README](../../packages/theme/README.md). The short version of the light defaults:

```css
:root {
  --dashfoo-background: oklch(1 0 0);
  --dashfoo-card: oklch(1 0 0);
  --dashfoo-foreground: oklch(0.145 0 0);
  --dashfoo-muted-foreground: oklch(0.556 0 0);
  --dashfoo-primary: oklch(0.205 0 0);
  --dashfoo-radius: 0.625rem;
}
```

Dark is opt-in. The theme ships light by default; set `data-dashfoo-theme="dark"`
on any ancestor to invert the grayscale for that subtree:

```html
<html data-dashfoo-theme="dark"></html>
```

You can also define your own light/dark token blocks (e.g. under
`@media (prefers-color-scheme: dark)`) if you're writing the skin from scratch.

## Starting your own skin

A minimal skin needs four blocks: the layout surface, the tabset card, the tabs
with their selected state, and the splitter. Everything else is refinement.

```css
[data-dashfoo="layout"] {
  background: oklch(1 0 0);
  color: oklch(0.145 0 0);
  padding: 1rem;
}
[data-dashfoo="tabset"] {
  border: 1px solid oklch(0.922 0 0);
  border-radius: 10px;
  background: oklch(1 0 0);
  overflow: hidden;
}
[data-dashfoo="tab"] {
  border: 0;
  background: transparent;
  color: oklch(0.556 0 0);
  padding: 7px 12px;
  cursor: pointer;
}
[data-dashfoo="tab"][aria-selected="true"] {
  color: oklch(0.145 0 0);
  font-weight: 500;
}
[data-separator][aria-orientation="vertical"] {
  width: 8px;
  cursor: col-resize;
}
[data-separator][aria-orientation="horizontal"] {
  height: 8px;
  cursor: row-resize;
}
```

Add the dock variables on `:root`, then fill in `tab-close`, `tabset-maximize`,
focus rings, and hover states as you go. The full reference for what
you can target is the two tables above.

## See also

- [`packages/theme/dashfoo.css`](../../packages/theme/dashfoo.css) for the complete worked skin, and [`packages/theme/tokens.css`](../../packages/theme/tokens.css) for the token defaults + dark overrides.
- `apps/demo-vite/src/index.css` for how the demo imports the theme.
- `packages/react/src/tabset-view.tsx` for the tabset markup and ARIA wiring.
- `packages/react/src/row-view.tsx` for the splitter (`<Separator data-dashfoo="splitter">`).
- `packages/react/src/drag-adapter.tsx` for the dock indicator and the `--dashfoo-dock-*` fallbacks.

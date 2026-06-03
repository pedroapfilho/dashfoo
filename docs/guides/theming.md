# Theming the headless chrome

`@dashfoo/react` renders the dock as plain DOM with zero imposed styling. No
class names, no inline colors, no default border on a tabset. Every structural
element instead carries a `data-dashfoo="..."` attribute (and the resize
splitters carry `data-separator` from react-resizable-panels). You write a skin
by selecting on those attributes from your own stylesheet.

That means the library ships the markup and the behavior; you own every pixel.
A skin is a regular CSS file. No theme provider, no style props, no runtime
config. This guide is the attribute reference plus the state hooks, and it uses
the demo's `apps/demo-vite/src/index.css` as the worked example throughout.

## Why attributes instead of class names

Two reasons drive the choice.

1. **Nothing to override.** A library that ships default styles forces you into
   specificity wars or `!important` to undo them. dashfoo ships none, so your
   first rule is also the only rule that matches.

2. **Stable selectors.** Class names churn across versions and get mangled by
   CSS-in-JS. The `data-dashfoo` values are part of the public contract: they
   change with a major version, not a refactor. Select on them the same way you
   would select on `role` or `aria-*`.

The demo's stylesheet leans into this. It is a single `@layer components` block
of attribute selectors, styled with Tailwind's `@apply`:

```css
@layer components {
  [data-dashfoo="layout"] {
    @apply bg-df-bg p-4 font-sans text-[13px] text-df-text antialiased;
  }
  [data-dashfoo="tabset"] {
    @apply min-h-0 min-w-0 flex-1 overflow-hidden rounded-df border border-df-border bg-df-surface;
  }
  /* ...one rule per attribute... */
}
```

Nothing here is dashfoo-specific machinery. Swap `@apply` for hand-written
properties and the same selectors work in plain CSS.

## Attribute reference

Every value of `data-dashfoo` the renderer emits, what element carries it, and
where it comes from. Read the right-hand column against the source files if you
want to confirm a selector before you write the rule.

| `data-dashfoo` value | Element                 | Role                                                                                                  |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `layout`             | root `<div>`            | The whole frame. Also the geometry anchor for border docking (`.closest('[data-dashfoo="layout"]')`). |
| `row`                | rrp `<Group>`           | A horizontal or vertical split container.                                                             |
| `tabset`             | `<div>`                 | One tiled region: a strip of tabs over a content panel.                                               |
| `tabstrip`           | `<div>`                 | The strip row: tablist plus trailing toolbar.                                                         |
| `tablist`            | `<div role="tablist">`  | The scrollable run of tabs.                                                                           |
| `tab-item`           | `<span>`                | One tab's group: the tab button and its close button.                                                 |
| `tab`                | `<button role="tab">`   | The selectable tab itself.                                                                            |
| `tab-close`          | `<button>`              | Per-tab close control.                                                                                |
| `tab-rename`         | `<input>`               | Inline rename editor, mounted on double-click.                                                        |
| `tabset-toolbar`     | `<div>`                 | Trailing controls area in the strip.                                                                  |
| `tabset-maximize`    | `<button>`              | Maximize / restore toggle.                                                                            |
| `tabcontent`         | `<div role="tabpanel">` | The active tab's content panel.                                                                       |
| `border`             | `<div>`                 | One frame edge: its strip plus optional drawer.                                                       |
| `border-strip`       | `<div>`                 | The run of edge-toggle buttons.                                                                       |
| `border-tab`         | `<button>`              | One edge toggle.                                                                                      |
| `border-drawer`      | `<section>`             | The panel a selected border tab opens.                                                                |
| `dock-indicator`     | `<div>`                 | The drag overlay: insertion line or drop-zone pane.                                                   |
| `splitter`           | rrp `<Separator>`       | The resize handle between panels. Also matchable as `[data-separator]`.                               |

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

The demo treats the tabset as a card and the strip as its header:

```css
[data-dashfoo="tabset"] {
  @apply min-h-0 min-w-0 flex-1 overflow-hidden rounded-df border border-df-border bg-df-surface;
}
[data-dashfoo="tabstrip"] {
  @apply items-stretch border-b border-df-border bg-df-strip pr-1.5;
}
[data-dashfoo="tabcontent"] {
  @apply bg-df-surface;
}
```

### The `tab-rename` input

There is no rename mode you opt a class into. When a renamable tab is
double-clicked, the `tab` button is swapped for an `<input data-dashfoo="tab-rename">`
in place. Style it as a normal text field; it focuses and selects itself on
mount, commits on Enter or blur, and cancels on Escape.

```css
[data-dashfoo="tab-rename"] {
  @apply m-[3px] w-24 rounded-sm border border-df-border-strong bg-df-bg px-2 py-1 text-[12.5px] text-df-text outline-none;
}
```

## State hooks

State does not arrive as extra `data-dashfoo` values. It rides on the native
ARIA and `data-*` attributes the elements already set, so your selectors compose
the structural attribute with the state attribute.

| State                  | Lives on                                  | Set when                                              | Source of truth                          |
| ---------------------- | ----------------------------------------- | ----------------------------------------------------- | ---------------------------------------- | --- | ----------- |
| `aria-selected="true"` | `[data-dashfoo="tab"]`                    | The tab is the active one in its tabset               | `aria-selected={index === selected}`     |
| `aria-pressed="true"`  | `[data-dashfoo="border-tab"]`             | The edge drawer for that tab is open                  | `aria-pressed={index === selected}`      |
| `aria-pressed="true"`  | `[data-dashfoo="tabset-maximize"]`        | The tabset is maximized                               | `aria-pressed={isMaximized}`             |
| `data-dragging`        | `[data-dashfoo="tab"]`                    | The tab is being dragged                              | `data-dragging={isDragging               |     | undefined}` |
| `data-drop-target`     | `[data-dashfoo="tabset"]`                 | A dragged tab is hovering this tabset                 | `data-drop-target={isDropTarget          |     | undefined}` |
| `data-edge`            | `border`, `border-strip`, `border-drawer` | Which frame edge: `left`, `right`, `top`, `bottom`    | `data-edge={node.edge}`                  |
| `tabIndex={0 / -1}`    | `[data-dashfoo="tab"]`                    | Roving tabindex: the selected tab is the one tab stop | `tabIndex={index === selected ? 0 : -1}` |

Two notes on the boolean `data-*` attributes. `data-dragging` and
`data-drop-target` are only present when true; they are set to `undefined`
otherwise, so the attribute is absent rather than `="false"`. Select on
presence:

```css
[data-dashfoo="tab"][data-dragging] {
  opacity: 0.5;
}
[data-dashfoo="tabset"][data-drop-target] {
  /* a dragged tab is over this region */
}
```

### Selected tab

The demo reads selection through `aria-selected` and adds a weight change plus an
underline pseudo-element. No color is used to carry the state on its own, which
keeps it legible without hue:

```css
[data-dashfoo="tab"] {
  @apply cursor-pointer rounded-t-md border-0 bg-transparent py-[7px] pr-1.5 pl-3 text-[12.5px] text-df-muted;
}
[data-dashfoo="tab"][aria-selected="true"] {
  @apply font-medium text-df-emphasis;
}
[data-dashfoo="tab-item"]:has([aria-selected="true"]) {
  @apply bg-df-surface;
}
[data-dashfoo="tab-item"]:has([aria-selected="true"])::after {
  @apply absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-df-emphasis;
  content: "";
}
```

The `:has()` rule is worth calling out. The active surface and the underline want
to sit on the `tab-item` wrapper, but the state lives on the inner `tab` button.
`:has()` lifts the state up one level without any extra attribute on the wrapper.

### Pressed border tab and maximize toggle

Both the edge toggles and the maximize button report their on/off state through
`aria-pressed`. The demo gives a pressed border tab a visible surface and border:

```css
[data-dashfoo="border-tab"][aria-pressed="true"] {
  @apply border-df-border-strong bg-df-surface text-df-emphasis;
}
```

### Edge-aware borders

A `border` and everything inside it carry `data-edge`. Use it to flip orientation
and to put the divider on the correct side. The demo runs the left and right edge
labels vertically and pins the divider toward the frame:

```css
[data-dashfoo="border-strip"][data-edge="left"],
[data-dashfoo="border-strip"][data-edge="right"] {
  @apply h-full flex-col border-df-border;
}
[data-dashfoo="border-strip"][data-edge="left"] {
  @apply border-r;
}
[data-dashfoo="border-strip"][data-edge="right"] {
  @apply border-l;
}
[data-dashfoo="border-strip"][data-edge="left"] [data-dashfoo="border-tab"],
[data-dashfoo="border-strip"][data-edge="right"] [data-dashfoo="border-tab"] {
  writing-mode: vertical-rl;
}
```

The drawer size comes from the model (`node.size`, defaulting to 240px), applied
inline as `width` or `height` depending on the edge. The skin only owns the
border and the surface:

```css
[data-dashfoo="border-drawer"][data-edge="left"] {
  @apply border-r;
}
[data-dashfoo="border-drawer"] {
  @apply border-df-border bg-df-surface;
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

The handle is invisible by default. The demo gives it a wide hit area with the
right cursor per orientation, then paints a thin pill with a `::before` so the
visual grip is narrower than the grab target:

```css
[data-separator] {
  @apply relative flex items-center justify-center bg-transparent;
}
[data-separator][aria-orientation="vertical"] {
  @apply w-4 cursor-col-resize;
}
[data-separator][aria-orientation="horizontal"] {
  @apply h-4 cursor-row-resize;
}
[data-separator]::before {
  @apply rounded-full bg-df-border-strong;
  content: "";
}
[data-separator][aria-orientation="vertical"]::before {
  @apply h-[30px] w-0.5;
}
[data-separator][aria-orientation="horizontal"]::before {
  @apply h-0.5 w-[30px];
}
[data-separator]:hover::before {
  @apply bg-df-emphasis;
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

| Variable                      | Default fallback            | Controls                        |
| ----------------------------- | --------------------------- | ------------------------------- |
| `--dashfoo-dock-fill`         | `rgba(125, 125, 135, 0.18)` | Drop-zone pane background.      |
| `--dashfoo-dock-border`       | `rgba(160, 160, 170, 0.75)` | Drop-zone pane border color.    |
| `--dashfoo-dock-border-width` | `1px`                       | Drop-zone pane border width.    |
| `--dashfoo-dock-radius`       | `6px`                       | Drop-zone pane corner radius.   |
| `--dashfoo-dock-line`         | `rgb(140, 140, 150)`        | Tab-strip insertion line color. |
| `--dashfoo-dock-line-radius`  | `2px`                       | Insertion line corner radius.   |

The indicator takes two visual forms from the same element. Dropping onto a tab
strip paints a thin insertion line (`--dashfoo-dock-line`); dropping onto the body
or a frame edge paints a filled pane (`--dashfoo-dock-fill` plus the border vars).
You do not select between them; setting the variables covers both.

The demo sets three of them on `:root` to keep the indicators grayscale:

```css
:root {
  color-scheme: dark;
  --dashfoo-dock-fill: rgba(255, 255, 255, 0.1);
  --dashfoo-dock-border: rgba(255, 255, 255, 0.4);
  --dashfoo-dock-line: rgba(255, 255, 255, 0.85);
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
and `transition` are owned by the library; leave those alone or the indicator
will not track the pointer.

## Focus and hit targets

The renderer wires the keyboard model (roving tabindex on the tablist, arrow keys
to move selection, Home/End to jump). The skin owns the visible focus ring. The
demo uses `:focus-visible` with an inset outline so the ring reads on the small
controls without clipping:

```css
[data-dashfoo="tab"]:focus-visible {
  @apply rounded-sm outline-2 outline-offset-[-2px] outline-df-emphasis;
}
[data-dashfoo="tab-close"]:focus-visible {
  @apply outline-2 outline-df-emphasis;
}
[data-dashfoo="tabset-maximize"]:focus-visible {
  @apply outline-2 outline-df-emphasis;
}
[data-dashfoo="border-tab"]:focus-visible {
  @apply outline-2 outline-df-emphasis;
}
```

Mind hit-target sizes on the icon controls. The demo gives `tab-close` a 16px box
and `tabset-maximize` a 24px box. The close control sits inside a larger
`tab-item` hover zone, but on touch you may want to grow both to meet the 44px
target guidance.

## Starting your own skin

A minimal skin needs four blocks: the layout surface, the tabset card, the tabs
with their selected state, and the splitter. Everything else is refinement.

```css
[data-dashfoo="layout"] {
  background: #0a0a0b;
  color: #ededee;
  padding: 1rem;
}
[data-dashfoo="tabset"] {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: #161617;
  overflow: hidden;
}
[data-dashfoo="tab"] {
  border: 0;
  background: transparent;
  color: #8b8b8f;
  padding: 7px 12px;
  cursor: pointer;
}
[data-dashfoo="tab"][aria-selected="true"] {
  color: #fafafa;
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
`border-*`, focus rings, and hover states as you go. The full reference for what
you can target is the two tables above.

## See also

- `apps/demo-vite/src/index.css` for the complete worked skin.
- `packages/react/src/tabset-view.tsx` for the tabset markup and ARIA wiring.
- `packages/react/src/border-view.tsx` for the edge strip and drawer markup.
- `packages/react/src/row-view.tsx` for the splitter (`<Separator data-dashfoo="splitter">`).
- `packages/react/src/drag-adapter.tsx` for the dock indicator and the `--dashfoo-dock-*` fallbacks.

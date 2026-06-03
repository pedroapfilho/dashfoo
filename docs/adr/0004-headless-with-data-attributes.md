# ADR 0004 — Headless components with a `data-dashfoo` attribute skin

## Status

Accepted · 2026-06-02

## Context

FlexLayout (the library dashfoo descends from) renders complete, painted
chrome: tab bars, splitters, borders, and overlays all arrive pre-styled.
Restyling means fighting baked-in class names and pixel values; restructuring
the chrome — moving a toolbar, changing where a close button sits, swapping the
maximize glyph — means forking the component tree. The visual treatment and the
layout engine are welded together.

dashfoo splits along the same fault line that FlexLayout couldn't. `@dashfoo/core`
is a pure engine (zod schema, structuredClone reducer, XState machines, geometry).
`@dashfoo/react` renders the markup and wires the rrp / dnd-kit adapters. The open
question for `@dashfoo/react`: how much look does it ship?

Shipping a stylesheet would reintroduce FlexLayout's problem in a new package.
Shipping nothing leaves consumers without the structural CSS the layout actually
needs to function (a tabset must fill its parent; a drawer must size to its edge).

## Decision

**`@dashfoo/react` is headless. It renders semantic markup carrying
`data-dashfoo="..."` hooks and only the inline styles required for the layout to
work. All visual treatment is the consumer's CSS.**

Three rules make this concrete.

### 1. Every styleable element carries a `data-dashfoo` value

The markup is the styling contract. Consumers select on `data-dashfoo`, never on
internal class names (there are none). The values shipped today:

| `data-dashfoo`    | Element                       | Source               |
| ----------------- | ----------------------------- | -------------------- |
| `layout`          | layout root                   | `dashfoo-layout.tsx` |
| `frame`           | inner frame wrapper           | `layout-frame.tsx`   |
| `row`             | the rrp `Group`               | `row-view.tsx`       |
| `splitter`        | the rrp `Separator`           | `row-view.tsx`       |
| `tabset`          | tabset container              | `tabset-view.tsx`    |
| `tabstrip`        | strip row (tablist + toolbar) | `tabset-view.tsx`    |
| `tablist`         | the `role="tablist"` row      | `tabset-view.tsx`    |
| `tab-item`        | one tab's wrapper (`<span>`)  | `tabset-view.tsx`    |
| `tab`             | the `role="tab"` button       | `tabset-view.tsx`    |
| `tab-close`       | per-tab close button          | `tabset-view.tsx`    |
| `tab-rename`      | inline rename `<input>`       | `tabset-view.tsx`    |
| `tabset-toolbar`  | trailing toolbar              | `tabset-view.tsx`    |
| `tabset-maximize` | maximize / restore button     | `tabset-view.tsx`    |
| `tabcontent`      | the `role="tabpanel"`         | `tabset-view.tsx`    |
| `dock-indicator`  | the drag drop-zone overlay    | `drag-adapter.tsx`   |

State that the consumer styles against rides on standard ARIA and small data
attributes, not class toggles: `aria-selected` / `aria-pressed` for the active
tab, `data-dragging` on a tab-item mid-drag, `data-drop-target` on a hovered tabset,
`data-separator` /
`aria-orientation` on the rrp splitters. The demo's selection underline is a pure
CSS read of that contract:

```css
[data-dashfoo="tab-item"]:has([aria-selected="true"])::after {
  /* the active-tab underline — no class, no JS, just the ARIA state */
  content: "";
}
```

### 2. Inline styles are structural only

The inline `style` objects in the views set flex / grid / sizing / position and
nothing else. `tabsetStyle` is `display: flex; flex-direction: column;
height/width: 100%; min-height/width: 0` so the tabset fills its parent whether
that parent is a flex item or rrp's block wrapper. None of these objects carry a
color, font, border, radius, or shadow. Those belong to the consumer.

### 3. The one painted element exposes overridable CSS variables

The dock indicator is the single element `@dashfoo/react` paints, because it is a
transient overlay positioned with `position: fixed` against live pointer
geometry. It has no DOM parent a consumer stylesheet could reach in time. Its
position and size are inline; every visual property is a CSS variable with a
neutral fallback:

```ts
const paneStyle = (zone: Zone): CSSProperties => ({
  ...overlayBase,
  background: "var(--dashfoo-dock-fill, rgba(125, 125, 135, 0.18))",
  border:
    "var(--dashfoo-dock-border-width, 1px) solid var(--dashfoo-dock-border, rgba(160, 160, 170, 0.75))",
  borderRadius: "var(--dashfoo-dock-radius, 6px)",
  height: zone.height,
  left: zone.x,
  top: zone.y,
  width: zone.width,
});
```

The overridable variables: `--dashfoo-dock-fill`, `--dashfoo-dock-border`,
`--dashfoo-dock-border-width`, `--dashfoo-dock-radius`, `--dashfoo-dock-line`,
`--dashfoo-dock-line-radius`. A consumer sets them on `:root` (or any ancestor)
and the overlay matches their theme. The fallbacks mean an unstyled app still
shows a legible drop zone.

## Consequences

- `@dashfoo/react` ships zero CSS. No stylesheet to import, no class names to
  override, no specificity war, no `!important`.
- A consumer can fully restyle the layout without forking, the thing FlexLayout
  made you fork for. The markup and ARIA states are the only contract, and they
  are stable.
- The demo theme (`apps/demo-vite/src/index.css`) is just CSS over the contract:
  Tailwind `@apply` rules keyed on `[data-dashfoo="..."]` selectors plus the
  three `--dashfoo-dock-*` overrides on `:root`. It demonstrates the styling path
  a real consumer would take; it is not privileged engine code.
- The structural inline styles win the cascade for layout-critical properties
  (a consumer cannot accidentally break `min-height: 0` and collapse a tabset).
  This is deliberate: structure is the engine's job, paint is the consumer's.
- An unstyled app is usable but plain: semantic, accessible, navigable by
  keyboard, with a visible drop indicator. It is not pretty. Producing the look
  is explicitly the consumer's (or `@dashfoo/theme`'s) work.

## Alternatives considered

1. **Ship a default stylesheet (FlexLayout's model).** Rejected. It reintroduces
   the exact coupling this library exists to break. A default look becomes the
   thing every consumer overrides, and overriding painted chrome is the problem.
2. **Expose a `classNames` / `slots` prop map instead of `data-*` attributes.**
   Rejected. It pushes styling through React props, couples theming to the
   component API, and breaks plain-CSS theming. `data-dashfoo` lets a stylesheet
   own the look with no prop wiring.
3. **CSS variables for everything, including tab and strip paint.** Rejected for
   the structural markup. A fixed set of variables can't anticipate every visual
   need, and `data-dashfoo` selectors already give full CSS reach. Variables are
   reserved for the dock indicator, the one element a stylesheet can't otherwise
   target.
4. **Defer all styling to `@dashfoo/theme` and ship the engine fully bare.**
   Not rejected, deferred. `@dashfoo/theme` is the Phase 7 placeholder that will
   ship an opt-in skin built on this same `data-dashfoo` contract. The headless
   posture is the precondition for it, not a competitor to it.

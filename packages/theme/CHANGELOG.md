# @dashfoo/theme

## 0.2.0

### Minor Changes

- 34feaed: Tailwind CSS v4 support via a dual artifact. New `@dashfoo/theme/tailwind.css` export: a Tailwind v4 source entry that puts the tokens in the `theme` layer and the skin in the `components` layer, and bridges the `--dashfoo-*` tokens through `@theme inline` so consumers get `dashfoo-*` utilities (`bg-dashfoo-card`, `text-dashfoo-foreground`, `rounded-dashfoo`, `font-dashfoo`, …) that follow the `data-dashfoo-theme="dark"` remap without `dark:` variants.

  The existing `@dashfoo/theme/dashfoo.css` specifier keeps working and still requires no build step — it now resolves to a prebuilt artifact compiled from the same source at package build time (unlayered, no preflight, byte-equivalent rules; the only drift is a progressive-enhancement `@supports` fallback Lightning CSS adds around the `color-mix()` dock-fill token). `@dashfoo/theme/tokens.css` is unchanged and now resolves to `src/css/tokens.css`.

### Patch Changes

- 7dcc411: Round the top corners of tab items so tabs read as attached to the tabset surface, and introduce a `--dashfoo-radius-sm` token (0.375rem) for nested chrome — tab corners, the tab focus ring, and the overflow/drag chips now resolve through it instead of a hardcoded radius.

## 0.1.0

### Minor Changes

- 7e76a84: Initial release of the default skin: framework-agnostic plain CSS over overridable `--dashfoo-*` tokens (`dashfoo.css` and `tokens.css` entry points), light by default with an opt-in dark variant via `data-dashfoo-theme="dark"`.

### Patch Changes

- 7e76a84: Replace the prop-based Panel helper with a compound `Panel.Root`, `Panel.Header`, `Panel.Title`, `Panel.Icon`, `Panel.Badge`, and `Panel.Body` API.

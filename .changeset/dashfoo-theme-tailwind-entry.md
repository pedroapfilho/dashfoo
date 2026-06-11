---
"@dashfoo/theme": minor
---

Tailwind CSS v4 support via a dual artifact. New `@dashfoo/theme/tailwind.css` export: a Tailwind v4 source entry that puts the tokens in the `theme` layer and the skin in the `components` layer, and bridges the `--dashfoo-*` tokens through `@theme inline` so consumers get `dashfoo-*` utilities (`bg-dashfoo-card`, `text-dashfoo-foreground`, `rounded-dashfoo`, `font-dashfoo`, …) that follow the `data-dashfoo-theme="dark"` remap without `dark:` variants.

The existing `@dashfoo/theme/dashfoo.css` specifier keeps working and still requires no build step — it now resolves to a prebuilt artifact compiled from the same source at package build time (unlayered, no preflight, byte-equivalent rules; the only drift is a progressive-enhancement `@supports` fallback Lightning CSS adds around the `color-mix()` dock-fill token). `@dashfoo/theme/tokens.css` is unchanged and now resolves to `src/css/tokens.css`.

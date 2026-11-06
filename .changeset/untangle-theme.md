---
"@dashfoo/theme": minor
---

The skin sizes the minimized chip from `--dashfoo-chip-width` and `--dashfoo-chip-height`, the same vars the structural clamp reads, so the chip stays fully on screen. A float you can't edit no longer shows a grab cursor on its title bar. The skin also stops repeating declarations that `@dashfoo/react/styles.css` already sets, so a stale copy can't override a structural change. `DASHFOO_THEME_VERSION` now reports the package version; it was always `"0.0.0"`. The unused `tabset-grip-label` rule is gone.

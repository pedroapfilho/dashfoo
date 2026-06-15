# dashfoo documentation

A headless React docking-layout library — tiled, resizable, tabbed regions with a serializable model and zero imposed styling. The guides live on the docs site; the package READMEs carry the per-package API reference; the ADRs record the architecture decisions.

## Guides — [docs.dashfoo.com](https://docs.dashfoo.com)

- [Getting started](https://docs.dashfoo.com/getting-started)
- [The layout model](https://docs.dashfoo.com/the-model)
- [Drag and dock](https://docs.dashfoo.com/drag-and-dock)
- [Controlled mode and undo/redo](https://docs.dashfoo.com/controlled-and-history)
- [Persisting layouts](https://docs.dashfoo.com/persistence)
- [Adaptive (responsive) layouts](https://docs.dashfoo.com/responsive)
- [Theming the headless chrome](https://docs.dashfoo.com/theming)
- [API reference](https://docs.dashfoo.com/api-reference)

The guide sources are the single source of truth in [`apps/docs/content/docs`](../apps/docs/content/docs) — edit them there. There is no second copy to keep in sync.

## Architecture decisions

- [ADR 0001 — Tiled docking only; no popouts, floating panels, sub-layouts, or free grid](./adr/0001-tiled-docking-only.md)
- [ADR 0002 — XState v5 for state, not zustand](./adr/0002-xstate-for-everything.md)
- [ADR 0003 — structuredClone over Immer for the reducer](./adr/0003-structuredclone-over-immer.md)
- [ADR 0004 — Headless components with a `data-dashfoo` attribute skin](./adr/0004-headless-with-data-attributes.md)
- [ADR 0005 — Build on @dnd-kit 0.4 and react-resizable-panels v4, behind adapters](./adr/0005-dnd-kit-04-and-rrp-v4.md) (amended: now the `@dnd-kit/dom` core)

Folder: [`docs/adr`](./adr)

## Package READMEs

- [dashfoo (repository overview)](../README.md)
- [@dashfoo/core](../packages/core/README.md) — pure TypeScript engine: zod schema, pure reducer, geometry, undo/redo history, serialize
- [@dashfoo/react](../packages/react/README.md) — `DashfooLayout`, the `Panel` helper, the `persist` prop, hooks, and the rrp / `@dnd-kit/dom` adapters; headless `data-dashfoo` markup
- [@dashfoo/theme](../packages/theme/README.md) — the opt-in default skin: framework-agnostic plain CSS over overridable `--dashfoo-*` tokens, light by default with an opt-in dark variant

## Specs

- [`docs/superpowers/specs`](./superpowers/specs)

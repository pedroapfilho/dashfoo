# dashfoo documentation

A headless React docking-layout library — tiled, resizable, tabbed regions with a serializable model and zero imposed styling. Start with the guides, then reach for the package READMEs and architecture decisions when you need the detail.

## Guides

- [Getting started](./guides/getting-started.md)
- [The layout model](./guides/the-model.md)
- [Drag and dock](./guides/drag-and-dock.md)
- [Controlled mode and undo/redo](./guides/controlled-and-history.md)
- [Persisting layouts](./guides/persistence.md)
- [Theming the headless chrome](./guides/theming.md)

Folder: [`docs/guides`](./guides)

## Architecture decisions

- [ADR 0001 — Tiled docking only; no popouts, floating panels, sub-layouts, or free grid](./adr/0001-tiled-docking-only.md)
- [ADR 0002 — XState v5 for state, not zustand](./adr/0002-xstate-for-everything.md)
- [ADR 0003 — structuredClone over Immer for the reducer](./adr/0003-structuredclone-over-immer.md)
- [ADR 0004 — Headless components with a `data-dashfoo` attribute skin](./adr/0004-headless-with-data-attributes.md)
- [ADR 0005 — Build on @dnd-kit/react 0.4 and react-resizable-panels v4, behind adapters](./adr/0005-dnd-kit-04-and-rrp-v4.md)

Folder: [`docs/adr`](./adr)

## Package READMEs

- [dashfoo (repository overview)](../README.md)
- [@dashfoo/core](../packages/core/README.md) — pure TypeScript engine: zod schema, pure reducer, geometry, undo/redo history, serialize
- [@dashfoo/react](../packages/react/README.md) — `DashfooLayout`, hooks, and the rrp / dnd-kit adapters; headless `data-dashfoo` markup
- [@dashfoo/theme](../packages/theme/README.md) — drop-in skin for the headless components (placeholder today)

## Specs

- [`docs/superpowers/specs`](./superpowers/specs)

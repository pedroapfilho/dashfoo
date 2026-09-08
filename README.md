<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/dashfoo-logo-dark.svg">
    <img alt="dashfoo" src="./assets/dashfoo-logo-light.svg" width="320">
  </picture>
  <p><strong>Docking layouts for React that you own.</strong></p>
</div>

dashfoo gives React tool builders tabs, nested splits, drag-docking, and in-app
floating panels. The whole arrangement is a JSON-serializable model. Start with
`DashfooLayout`, or compose the chrome from `Layout` and `Tabset` parts.

**MIT licensed · early-adopter release · React 18.3.1 and 19 · ESM only**

[Try the demo](https://demo.dashfoo.com) · [Documentation](https://docs.dashfoo.com) ·
[Website](https://www.dashfoo.com) · [Issues and questions](https://github.com/pedroapfilho/dashfoo/issues)

## Quickstart

```sh
npm install @dashfoo/core @dashfoo/react @dashfoo/theme
# or
pnpm add @dashfoo/core @dashfoo/react @dashfoo/theme
```

```tsx
import { model, row, tab, tabset } from "@dashfoo/core";
import { DashfooLayout } from "@dashfoo/react";
import "@dashfoo/theme/dashfoo.css";

const layout = model(
  row(
    [
      tabset([tab("chart", "Chart"), tab("notes", "Notes")], { id: "main" }),
      tabset([tab("activity", "Activity")], { id: "side" }),
    ],
    { id: "root" },
  ),
);

export const Dashboard = () => (
  <div style={{ height: "100dvh" }}>
    <DashfooLayout
      defaultModel={layout}
      factory={(node) => <p>{node.name} content</p>}
      floatable
      responsive={{ maxWidth: 720 }}
    />
  </div>
);
```

Give the mount chain a height and remove scaffold CSS that constrains `#root`:

```css
html,
body,
#root {
  height: 100%;
  margin: 0;
}
```

Use the [complete getting-started guide](https://docs.dashfoo.com/getting-started),
or copy the standalone [Vite](./examples/vite) or [Next.js](./examples/next) starter.
In Next.js, define factories and registries in a `"use client"` module.

## What it does

| Capability        | Details                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Docking           | Move tabs or whole tabsets; stack, reorder, or split in four directions. Drag external widgets into the layout. |
| Sizing            | Nested rows and columns, proportional weights, min/max constraints, magnetic split snapping.                    |
| Floating panels   | Move, resize, rename, minimize, and dock back within the same app. Drag tabs into and out of floats.            |
| State             | Controlled or uncontrolled state, action interception, imperative controls, undo/redo in uncontrolled mode.     |
| Persistence       | Validated JSON, pluggable synchronous storage, debounced writes, restore after hydration.                       |
| Composition       | Use the complete component, slots, or public Layout/Tabset parts to arrange your own chrome.                    |
| Appearance        | Structural positioning styles only; supply a skin or use the optional light/dark theme and its tokens.          |
| Adaptive layouts  | Stack and lock restructuring at a breakpoint while retaining the desktop arrangement.                           |
| Content lifecycle | Inactive content unmounts by default. `keepMounted` retains state across tab switches.                          |

Tab content never lives in the model: `component` is a registry key. Provide a
`components` registry or `factory` to render it. Use unique ids when reusing a
component key. State that must survive moving between tabsets belongs outside
individual panel components.

## Fit and limitations

Use dashfoo for editors, terminals, internal tools, and dashboards whose users
need to arrange their workspace. A simple two-pane split may only need
[react-resizable-panels](https://github.com/bvaughn/react-resizable-panels).
A freeform coordinate grid is a different model; consider
[react-grid-layout](https://github.com/react-grid-layout/react-grid-layout).

Docking is **pointer-only**. Tabs support arrow-key selection and the exposed
buttons support keyboard activation, but this release has no keyboard docking
or native browser-window popouts. Floating panels stay in the same document.
Responsive mode disables restructuring below its configured width. There is
no broad WCAG conformance claim for arbitrary consumer-built chrome.

This release is for early adopters. APIs can evolve; the persisted schema is
currently version `1`, with no built-in migration machinery. Controlled mode
requires application-owned history. Widget state is separate from layout persistence.

## Packages and API reference

| Package          | Purpose                                                                                          | Reference                         |
| ---------------- | ------------------------------------------------------------------------------------------------ | --------------------------------- |
| `@dashfoo/core`  | Framework-free schemas, builders, reducer, geometry, history, serialization, and state machines. | [API](./packages/core/README.md)  |
| `@dashfoo/react` | Layout, compound parts, hooks, persistence, and drag/resize adapters.                            | [API](./packages/react/README.md) |
| `@dashfoo/theme` | Prebuilt CSS, a Tailwind v4 entry, and overridable design tokens.                                | [API](./packages/theme/README.md) |

React and React DOM are peers. Zod, XState, dnd-kit, react-resizable-panels,
and Zustand are installed transitively as package dependencies. They are not
all bundled into the published JavaScript; your application bundler resolves them.
Core exports its state machines for lower-level integrations. The React-facing
layout/store API does not require primitive instances.

## Development and feedback

Requires Node 24+ and pnpm 11.

```sh
pnpm install
pnpm dev
pnpm verify
pnpm format:check
pnpm fallow:dead
pnpm --filter demo-vite test:e2e
pnpm --filter docs test:e2e
pnpm test:consumers
```

See [CONTRIBUTING](./CONTRIBUTING.md), [support](./SUPPORT.md), and the
[launch checklist](./docs/launch/checklist.md). Canonical guides live in
`apps/docs/content/docs`; package READMEs describe the public API.

## License

[MIT](./LICENSE), Pedro Filho.

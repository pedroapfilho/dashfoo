# Launch questions and answers

## Why another docking library?

The design focus is ownership of the chrome. Dashfoo offers a complete layout
component and public Layout/Tabset parts over a serializable model. A team can
rearrange the tabstrip, labels, and toolbar without implementing the docking engine.

## How does it compare with FlexLayout or Dockview?

Evaluate the component composition API and your required interactions directly.
Dashfoo supports in-app floating panels and does not support native-window
popouts or keyboard docking. It does not claim feature parity or superior
performance over either project. See their current upstream documentation:
[FlexLayout](https://github.com/caplin/FlexLayout) and
[Dockview](https://dockview.dev/docs/).

## Is it a grid layout or a dashboard product?

It is a split/tab layout engine with a floating layer. It does not supply your
application's charts, data, or a freeform coordinate grid. The showcase uses
sample content. For a simple split, a splitter library may be sufficient.

## Does headless mean no CSS at all?

No. The engine needs structural positioning styles. Visual appearance comes from
your CSS or the optional theme. The theme has prebuilt CSS and a Tailwind v4 entry.

## Does everything stay mounted?

Inactive tabs unmount by default. `keepMounted` preserves local state across tab
switches. Moving across tabsets can remount content; state that must survive
reparenting belongs in application state. Saving a layout does not save widget data.

## What about SSR and persistence?

Use a client dashboard module in Next.js. The seed renders on the server and
first client render; valid storage is applied after hydration without an undo
entry. Storage errors warn and leave the UI usable. Layouts use schema version
1, and applications own migration or storage-key rotation if needed.

## What does the accessibility claim cover?

Tabs have keyboard selection, controls expose names, and the default scroll
regions are keyboard reachable. Automated checks and browser tests are release
evidence, not a general conformance guarantee. Docking and float movement are
pointer interactions. Consumer chrome needs its own accessibility assessment.

## What are the dependencies and bundle cost?

React and React DOM are peers. Zod, XState, Zustand, dnd-kit, and
react-resizable-panels are installed dependencies. The consumer measurement report
compares a production starter build against a React-only baseline; package tarball
size is not used as a claim about application bundle cost.

## Is it production-stable? Who maintains it?

This is an early-adopter release maintained by Pedro Filho. The MIT license
permits commercial use, but there is no support SLA or blanket stability promise.
Report issues with a minimal reproduction and check release notes before upgrading.

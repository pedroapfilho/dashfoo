# @dashfoo/react

The React layer for dashfoo: a headless docking-layout component in the
FlexLayout / VS-Code mold: tiled, resizable, tabbed regions with drag-to-dock,
maximize, close, and inline rename.

"Headless" is the whole point. `@dashfoo/react` renders semantic markup tagged
with `data-dashfoo="..."` attributes and applies **zero** visual styling. It
sizes and positions nodes (flex, percentages, the resize handles) and wires up
roles, focus, and keyboard behavior. Everything you can see (color, borders,
radius, spacing, the look of a tab or a dock indicator) is yours to write
against the `data-dashfoo` selectors. The package owns the geometry; you own the
paint.

It builds on three engines:

- **[react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)** for splitter resize (the resize adapter is the only file that imports it).
- **[@dnd-kit/dom](https://github.com/clauderic/dnd-kit) 0.5**, the framework-agnostic core (no React bindings), for drag (touched only by the drag adapter modules: `drag-adapter`/`drag-hooks`/`drag-overlays`; pointer-only). Tabsets are dnd-kit droppables behind a custom occlusion-aware collision detector; the preview chip rides the Feedback plugin's `overlay` accessor.
- **[@dashfoo/core](https://www.npmjs.com/package/@dashfoo/core)** for the document: a zod schema, a pure reducer, and the XState machines that drive state and the drag lifecycle.

## Install

```bash
pnpm add @dashfoo/react @dashfoo/core react react-dom
```

React 18.3+ or 19 is a peer dependency.

## Quick start

A tab's `component` field is a string key. Map those keys to React components
through the `components` registry; each component receives the live `TabNode`.

```tsx
import { DashfooLayout } from "@dashfoo/react";
import type { TabNode } from "@dashfoo/core";
import { model, row, tabset, tab } from "@dashfoo/core";

// Optional default skin; without it the chrome is unstyled (headless).
import "@dashfoo/theme/dashfoo.css";

const startingModel = model(
  row([tabset([tab("editor", "Editor"), tab("preview", "Preview")], { id: "ts1" })]),
);

const Editor = ({ node }: { node: TabNode }) => <div>editing {node.name}</div>;
const Preview = ({ node }: { node: TabNode }) => <div>preview of {node.name}</div>;

export const App = () => (
  <DashfooLayout defaultModel={startingModel} components={{ editor: Editor, preview: Preview }} />
);
```

The `model` / `row` / `tabset` / `tab` builders come from `@dashfoo/core`; they
produce the same plain object you could write by hand. If you don't import
`@dashfoo/theme`, nothing renders until you style it: the container is
`[data-dashfoo="layout"]` with `display: flex; height: 100%; width: 100%`; give it
a sized parent and add your CSS (see the [attribute reference](#data-dashfoo-attribute-reference)).

## `DashfooLayout` props

| Prop                      | Type                                                                    | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`                   | `Dashfoo`                                                               | (none)  | Controlled document. When set, the prop is the source of truth.                                                                                                                                                                                                                                                                                                                                                                             |
| `defaultModel`            | `Dashfoo`                                                               | (none)  | Uncontrolled initial document. The component owns it from there.                                                                                                                                                                                                                                                                                                                                                                            |
| `onModelChange`           | `(model: Dashfoo, action?: Action) => void`                             | (none)  | Called after every change with the next model and the action that caused it.                                                                                                                                                                                                                                                                                                                                                                |
| `components`              | `Record<string, ComponentType<{ node: TabNode }>>`                      | (none)  | Registry mapping `tab.component` keys to components.                                                                                                                                                                                                                                                                                                                                                                                        |
| `factory`                 | `(tab: TabNode) => ReactNode`                                           | (none)  | Render override. When provided, it resolves every tab and `components` is ignored.                                                                                                                                                                                                                                                                                                                                                          |
| `persist`                 | `string \| { key; storage?; debounceMs? }`                              | (none)  | Auto-save the model (uncontrolled mode only). A bare string is a localStorage key.                                                                                                                                                                                                                                                                                                                                                          |
| `onAction`                | `(action: Action) => Action \| null`                                    | (none)  | Intercept each action before it commits: return it, a replacement, or `null` to veto.                                                                                                                                                                                                                                                                                                                                                       |
| `onActiveTabsetChange`    | `(id: string \| undefined) => void`                                     | (none)  | Fires when the active tabset changes.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `onMaximizedTabsetChange` | `(id: string \| undefined) => void`                                     | (none)  | Fires when a tabset is maximized or restored.                                                                                                                                                                                                                                                                                                                                                                                               |
| `renderTabLabel`          | `(tab: TabNode) => ReactNode`                                           | (none)  | Override the tab label (the accessible name stays `tab.name`).                                                                                                                                                                                                                                                                                                                                                                              |
| `renderTabsetToolbar`     | `(tabset: TabsetNode) => ReactNode`                                     | (none)  | Inject custom controls into a tabset's toolbar.                                                                                                                                                                                                                                                                                                                                                                                             |
| `editable`                | `boolean`                                                               | `true`  | `false` renders a static layout: no drag, close, rename, or splitter resize. Tab selection, maximize, and the ref API keep working.                                                                                                                                                                                                                                                                                                         |
| `closableTabs`            | `boolean`                                                               | `true`  | Show the per-tab close control.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `renamableTabs`           | `boolean`                                                               | `true`  | Allow double-click inline rename.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `maximizable`             | `boolean`                                                               | `true`  | Show the tabset maximize/restore control.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `floatable`               | `boolean`                                                               | `false` | Show a per-tabset control that floats the panel into a movable, resizable overlay, and render any floating panels. See below.                                                                                                                                                                                                                                                                                                               |
| `draggableTabs`           | `boolean`                                                               | `true`  | Allow individual tabs to be dragged between tabsets.                                                                                                                                                                                                                                                                                                                                                                                        |
| `draggableTabsets`        | `boolean`                                                               | `true`  | Show the grip that drags a whole tabset.                                                                                                                                                                                                                                                                                                                                                                                                    |
| `resizableSplits`         | `boolean`                                                               | `true`  | Allow dragging the splitters; `false` disables them in place (gutters keep their size).                                                                                                                                                                                                                                                                                                                                                     |
| `keepMounted`             | `boolean`                                                               | `false` | Keep inactive tab panels mounted (hidden) so their state survives a tab switch.                                                                                                                                                                                                                                                                                                                                                             |
| `responsive`              | `{ maxWidth: number; orientation? }`                                    | (none)  | At/below `maxWidth` (the layout's own container width) render a stacked column and lock drag + resize. View-only projection: no remount, state preserved. See below.                                                                                                                                                                                                                                                                        |
| `snap`                    | `{ step?: number; divisions?: number \| "panels"; threshold?: number }` | (none)  | Magnetic splitter snapping onto a grid: the union of `step` (multiples of a fixed percent) and `divisions` (even splits: `100/d`, or `"panels"` to divide by the row's panel count, so a 3-panel row snaps to thirds). Within `threshold` percent (default `4`) it snaps and commits on release as one undo step. Off when omitted; replaces `global.snap`; a row overrides via its own `snap` (`{}` disables). Locked off in compact mode. |

You must pass either `model` or `defaultModel`. Passing neither throws.

A `ref` exposes a `DashfooHandle` for imperative control:
`addTab`, `closeTab`, `selectTab`, `renameTab`, `maximizeTabset`, `floatTab`,
`dockFloat`, `dispatch`, `getModel`, `undo` / `redo` / `canUndo` / `canRedo`,
and `resetLayout()` (reset to the original `defaultModel`, clearing undo history and
any persisted copy).

```tsx
const ref = useRef<DashfooHandle>(null);
<DashfooLayout defaultModel={model} ref={ref} ... />;
ref.current?.undo();
ref.current?.resetLayout();
```

### Controlled vs. uncontrolled

**Uncontrolled** (`defaultModel`): the internal XState actor owns the document
and gives you undo/redo. `onModelChange` still fires on every change if you want
to observe or persist.

```tsx
<DashfooLayout defaultModel={model} components={registry} />
```

**Controlled** (`model`): your prop is the source of truth. Every interaction
routes through `onModelChange` with the reduced next model; you store it and pass
it back.

```tsx
const [model, setModel] = useState(initialModel);

<DashfooLayout model={model} onModelChange={setModel} components={registry} />;
```

The model is normalized at the boundary on the way in (selection clamped, no
empty tabsets, `maximizedTabsetId` pointed at a live node), so a hand-written
model gets the same invariants the reducer guarantees.

### Resolving tab content: registry or factory

`factory` wins when both are set. With `components`, a tab whose `component` key
is not registered renders nothing and logs a one-time dev warning:
`[dashfoo] no component registered for "<key>"`.

```tsx
// Registry: keyed lookup, the common case.
<DashfooLayout components={{ editor: Editor, terminal: Terminal }} ... />

// Factory: full control, e.g. switch on node fields or wrap in a boundary.
<DashfooLayout factory={(tab) => <Pane id={tab.id}>{tab.name}</Pane>} ... />
```

### `Panel`: common panel chrome

`Panel` is an optional compound helper for common panel chrome: compose a root,
header, title/icon/badge slots, and body around your content. It's headless: it
emits `data-dashfoo="panel*"` attributes and the theme styles them.

```tsx
import { Panel } from "@dashfoo/react";

const ChartPanel = ({ node }: { node: TabNode }) => (
  <Panel.Root>
    <Panel.Header>
      <Panel.Icon>
        <MyIcon />
      </Panel.Icon>
      <Panel.Title>{node.name}</Panel.Title>
      <Panel.Badge>Live</Panel.Badge>
    </Panel.Header>
    <Panel.Body>{/* your content */}</Panel.Body>
  </Panel.Root>
);
```

| Part           | Element  | Description                                                    |
| -------------- | -------- | -------------------------------------------------------------- |
| `Panel.Root`   | `<div>`  | Panel shell.                                                   |
| `Panel.Header` | `<div>`  | Header row.                                                    |
| `Panel.Title`  | `<span>` | Header title.                                                  |
| `Panel.Icon`   | `<span>` | Optional leading icon slot; consumers choose the icon library. |
| `Panel.Badge`  | `<span>` | Optional trailing badge; accepts arbitrary children.           |
| `Panel.Body`   | `<div>`  | Scrollable body content.                                       |

## The chrome

The component renders interactive controls into the markup. Each is plain HTML
with the right role and ARIA wiring, ready for you to style.

- **Close**: a `[data-dashfoo="tab-close"]` button next to each tab label, shown when closing is enabled. Dispatches `deleteTab`.
- **Rename**: double-click a tab to swap its label for a `[data-dashfoo="tab-rename"]` input. Enter commits, Escape cancels, blur commits. A trimmed, changed value dispatches `renameTab`; focus returns to the tab afterward.
- **Maximize**: a `[data-dashfoo="tabset-maximize"]` toggle in the tabset toolbar. Dispatches `setMaximizedTabset`; one maximized tabset fills the frame and `aria-pressed` reflects state.
- **Float**: a `[data-dashfoo="tabset-float"]` button in the tabset toolbar, shown when `floatable`. Floats the tabset into a movable, resizable overlay (`floatTabset`); the float's `[data-dashfoo="float-dock"]` control docks it back (`dockFloat`). See "Floating panels" below.
- **Tabs**: roving-tabindex keyboard model (WAI-ARIA APG): Arrow keys move and select, Home/End jump to the ends, focus follows selection.
- **Drag-to-dock**: drag a tab to restack it or split a tabset (when split-dock is on). A `[data-dashfoo="dock-indicator"]` previews where it lands.

### Per-node enable flags

The top-level chrome props are layout-wide gates. Individual nodes can opt out
through optional boolean fields in the model (a flag defaults to enabled unless
explicitly `false`). A control shows only when the `editable` umbrella, the
chrome prop, the model global, and the node's flag all allow it (`maximizable`
ignores `editable`; maximize is view state, not a structural edit).

| Field               | On node | Disables                                         |
| ------------------- | ------- | ------------------------------------------------ |
| `enableClose`       | tab     | the close control for that tab                   |
| `enableClose`       | tabset  | closing for every tab in the tabset              |
| `enableRename`      | tab     | double-click rename for that tab                 |
| `enableDrag`        | tab     | dragging that tab                                |
| `enableMaximize`    | tabset  | the maximize control for that tabset             |
| `tabEnableDrag`     | global  | tree-wide default behind `tab.enableDrag`        |
| `enableSplitDock`   | global  | splitting a tabset on drop (drops stack instead) |
| `enableSplitResize` | global  | dragging the splitters (gutters keep their size) |

```ts
{ id: "logs", type: "tab", name: "Logs", component: "logs", enableClose: false }
```

### Panel sizing

Rows and tabsets can carry `min` and `max` dimensions from `@dashfoo/core`.
`DashfooLayout` passes those constraints to `react-resizable-panels`. When a
tabset has no node-level `min`, it uses `global.tabSetMinSize`; when that global
is omitted, the React adapter falls back to `320px`.

## External drag sources

Tabs normally move within a layout. To drag new content in from outside it (a
widget list, a palette, a marketplace), wrap both sides in `DashfooDragProvider`
and register each source with `useExternalTabSource`. Dropping a source on the
layout inserts the tab it creates (stacking on a strip or body, splitting on an
edge), exactly like an internal tab drop. A drop outside any tabset is a no-op.

```tsx
import { createTabId, tab } from "@dashfoo/core";
import { DashfooDragProvider, DashfooLayout, useExternalTabSource } from "@dashfoo/react";

const WidgetCard = ({ component, name }: { component: string; name: string }) => {
  const { ref } = useExternalTabSource({
    createTab: () => tab(component, name, { id: createTabId() }),
    label: name,
  });
  return <div ref={ref}>{name}</div>;
};

const App = () => (
  <DashfooDragProvider>
    <WidgetCard component="metrics" name="Metrics" />
    <DashfooLayout defaultModel={model} components={registry} />
  </DashfooDragProvider>
);
```

`createTab` runs at drag start and must return a fresh `TabNode` with a unique
id per call (`createNodeId` / `createTabId` from `@dashfoo/core` mint one). The
returned node is validated against the model schema; an invalid tab warns and
cancels the drag. `DashfooDragProvider` is optional everywhere else; a
standalone layout needs no provider. Pointer drag is the only drag input, so
offer a click-to-add path (e.g. `ref.addTab(...)`) alongside the drag for
keyboard access.

`useExternalTabSource` options:

| Option      | Type            | Default    | Description                                |
| ----------- | --------------- | ---------- | ------------------------------------------ |
| `createTab` | `() => TabNode` | (required) | Builds the tab to insert; called per drag. |
| `label`     | `string`        | `""`       | The drag preview chip text.                |
| `disabled`  | `boolean`       | `false`    | Unregisters the source while true.         |

## Responsive layouts

Panels are weight-based, so the tree already scales with its container. To
_restructure_ on small screens, give `DashfooLayout` a `responsive` prop:

```tsx
<DashfooLayout defaultModel={model} factory={renderPanel} responsive={{ maxWidth: 720 }} />
```

At or below `maxWidth` (measured on the layout's own container, not the viewport),
the layout renders as a single stacked column and **locks every structural
interaction** (tab/tabset drag, split resize), leaving tap-to-switch and
maximize. This mirrors VS Code: docking is a desktop interaction, so narrow
screens get a read-only, navigable view instead of unusable hit targets.

The stacked view is a **derived projection**: the model in the store is never
mutated, so the layout is never remounted and widening past `maxWidth` restores
the desktop arrangement exactly. Undo history, persistence, selection, and
mounted panels all survive the breakpoint cross. The theme grows tab hit targets
to 44px under `@media (pointer: coarse)` so tap-to-switch stays usable.

Hand-built layouts (the `Layout.*` primitives) get the same behavior with
`useContainerWidth` + `stackModel`; for _distinct_ per-breakpoint models, use
`useResponsiveModel`. Both feed reactive props with no `key`/remount.

## Floating panels

Pass `floatable` to let a panel float out into a movable, resizable overlay,
FlexLayout style:

```tsx
<DashfooLayout defaultModel={model} factory={renderPanel} floatable />
```

Each tabset toolbar gains a `[data-dashfoo="tabset-float"]` control that floats the
whole tabset into an overlay (dispatching `floatTabset`). Drag its
`[data-dashfoo="float-titlebar"]` to move it anywhere on the page, the edge/corner
handles to resize, the `[data-dashfoo="float-minimize"]` control to collapse it to a
chip, and the `[data-dashfoo="float-dock"]` "Dock back" control to return it
(`dockFloat`). Floating panels are first-class model nodes (`Dashfoo.floats` in
`@dashfoo/core`), so they serialize and round-trip like docked panels.

How it works:

- **Same React tree, full drag-dock.** A float renders through the normal
  `Layout.Rows` in the same tree, sharing one drag manager with the docked layout,
  so app context (a theme provider, a query client), event handling, your
  stylesheet, and **dragging tabs into and out of a float** all just work. The
  overlay is `pointer-events: none`, so empty space stays click-through to the
  docked layout underneath.
- **Drag anywhere + resize commit one step.** The overlay is viewport-fixed, so a
  float drags across the whole page. Drag and resize update the DOM imperatively and
  dispatch a single `moveFloat` on release, so a drag is one undo step.
- **Named, renamable title.** Each float carries its own name ("Panel", "Panel 1",
  …), shown as the window title, never the active tab's. Double-click the title to
  rename it (`renameFloat`).
- **Minimize.** The minimize control collapses a float to a chip
  (`setFloatMinimized`); tapping the chip restores it to its saved rect.
- **Dock back as a panel.** "Dock back" returns the float as its own panel (all its
  tabs, grouped) instead of flattening them into another tabset.
- **Bring to front.** Clicking anywhere in a float (body, a tab, or chrome)
  raises it above the others.
- **Honors `editable`.** Under `editable={false}` a float is static: its content
  stays selectable and it still raises to the front, but move, resize, rename,
  minimize, and dock-back are switched off (no `moveFloat` / `renameFloat` /
  `setFloatMinimized` / `dockFloat`).

Hand-built layouts opt in by wrapping the tree's content with `Layout.FloatLayer`
(passing `floats` + `global`) and adding `Tabset.FloatButton`. `Tabset.FloatButton`
hides itself (and warns) if no `Layout.FloatLayer` is present.

## Persistence

The `persist` prop saves an uncontrolled layout and restores it on load. It loads
once (validated through `@dashfoo/core`'s serialize, falling back to
`defaultModel` on a miss or corrupt value) and debounce-saves every change. A
`ref` exposes `resetLayout()` to clear the saved copy and return to the default.

```tsx
import type { DashfooHandle } from "@dashfoo/react";
import { DashfooLayout } from "@dashfoo/react";
import { useRef } from "react";

const Layout = () => {
  const ref = useRef<DashfooHandle>(null);

  return (
    <>
      <DashfooLayout defaultModel={model} persist="my-app:layout" ref={ref} components={registry} />
      <button type="button" onClick={() => ref.current?.resetLayout()}>
        Reset layout
      </button>
    </>
  );
};
```

`persist` accepts a bare localStorage key or `{ key, storage?, debounceMs? }` for
a custom store (sessionStorage, in-memory, your own). A pending save flushes on
unmount and on page hide (reload, tab close, navigation, the page going to the
background), so the last change is never lost, even inside the debounce window.
It applies to uncontrolled mode only; in controlled mode, save the model yourself
in `onModelChange`.

The lower-level `usePersistence` load/save primitive (that `persist` is built on)
is also exported, for hosts that drive the store directly. See the
[persistence guide](https://docs.dashfoo.com/persistence) for the storage seam,
validation pipeline, and SSR notes.

### Options

The full form of `persist` (`{ key, storage?, debounceMs? }`):

| Option       | Type             | Default               | Description                                       |
| ------------ | ---------------- | --------------------- | ------------------------------------------------- |
| `key`        | `string`         | (required)            | Storage key. A bare `persist="key"` is shorthand. |
| `storage`    | `StorageAdapter` | `localStorageAdapter` | Where to read and write.                          |
| `debounceMs` | `number`         | `300`                 | Save debounce window.                             |

### Storage adapters

`StorageAdapter` is a `localStorage`-shaped backend, so a layout can persist to
the browser, an in-memory map, or a custom store.

```ts
type StorageAdapter = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};
```

Two adapters ship with the package:

- `localStorageAdapter`: SSR-safe `window.localStorage`. Reads return `null` and writes are swallowed (with a warning) when storage is unavailable or throws (no window, private mode, quota exceeded). This is the default.
- `memoryStorageAdapter()`: a fresh in-memory `Map`, returned by a factory call. Good for tests and SSR previews.

```tsx
import { memoryStorageAdapter } from "@dashfoo/react";

const storage = useMemo(() => memoryStorageAdapter(), []);

<DashfooLayout defaultModel={model} persist={{ key: "preview", storage }} />;
```

## `data-dashfoo` attribute reference

Every styleable element carries a `data-dashfoo` attribute. Selectors are stable;
target them in your stylesheet. The package sets only the positioning styles it
needs inline (sizes, flex, the dock indicator's position) and leaves the rest to
you.

| `data-dashfoo` value | Element         | Notes                                                                                                                              |
| -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `layout`             | root `div`      | The outer container. `display: flex` over the full parent.                                                                         |
| `row`                | rrp `Group`     | A resizable row/column. `orientation` comes from the node.                                                                         |
| `splitter`           | rrp `Separator` | Resize handle between siblings (also matches `[data-separator]`, see below).                                                       |
| `tabset`             | `div`           | A tabbed region. Carries `data-dragging-source` while the whole tabset is being dragged, and `data-tab-location` (`top`/`bottom`). |
| `tabstrip`           | `div`           | The strip row: tablist plus a trailing toolbar slot.                                                                               |
| `tablist`            | `div`           | `role="tablist"`, the tabs themselves.                                                                                             |
| `tab-item`           | `span`          | Wraps one tab's button and its close button. `data-dragging` while dragged.                                                        |
| `tab`                | `button`        | `role="tab"`. Carries `aria-selected` and `data-tab-id`.                                                                           |
| `tab-close`          | `button`        | Per-tab close. `aria-label="Close <name>"`.                                                                                        |
| `tab-rename`         | `input`         | Inline rename editor, shown during a rename.                                                                                       |
| `tabset-toolbar`     | `div`           | Trailing controls in the strip: overflow menu, grip, custom toolbar slot, pop-out, maximize.                                       |
| `tab-overflow-root`  | `div`           | Wraps the overflow trigger and its menu; rendered when tabs don't fit the strip.                                                   |
| `tab-overflow`       | `button`        | Overflow menu trigger. `aria-label="More tabs"`.                                                                                   |
| `tab-overflow-menu`  | `div`           | `role="menu"`, lists the hidden tabs while open.                                                                                   |
| `tab-overflow-item`  | `button`        | `role="menuitem"`, one hidden tab; selecting it activates the tab.                                                                 |
| `tabset-grip`        | `button`        | Drags the whole tabset. `aria-label="Move tabset"`; shown when `draggableTabsets` is on and the tabset is not maximized.           |
| `tabset-float`       | `button`        | Floats the tabset into a movable overlay. `aria-label="Float panel"`; shown when `floatable` is on and not maximized.              |
| `tabset-maximize`    | `button`        | Maximize/restore toggle. `aria-pressed` reflects state.                                                                            |
| `tabcontent`         | `div`           | `role="tabpanel"`, the active tab's content (or empty when none).                                                                  |
| `float-overlay`      | `div`           | The `pointer-events: none` overlay covering the layout; holds the floats.                                                          |
| `float`              | `div`           | A floating panel's elevated frame. `display: flex; flex-direction: column`, positioned absolutely.                                 |
| `float-titlebar`     | `div`           | The float's drag handle / title bar (grip + title + dock control).                                                                 |
| `float-grip`         | `span`          | Drag-affordance dots in the title bar (decorative, `aria-hidden`).                                                                 |
| `float-title`        | `span`          | The float's window title (its own name); double-click to rename. `aria-hidden` grip precedes it.                                   |
| `float-rename`       | `input`         | The inline title editor, shown while renaming. `aria-label="Rename <name>"`.                                                       |
| `float-minimize`     | `button`        | Collapses the float to a chip. `aria-label="Minimize panel"`.                                                                      |
| `float-dock`         | `button`        | Docks the panel back into the main layout. `aria-label="Dock panel back into the main layout"`.                                    |
| `float-body`         | `div`           | The float's content area; holds the panel's layout.                                                                                |
| `float-resize`       | `div`           | An edge/corner resize handle (eight in total); `data-edge` is the direction.                                                       |
| `float-chip`         | `button`        | A minimized float: a rounded chip you click (or drag) to restore.                                                                  |
| `float-chip-label`   | `span`          | The chip's panel title.                                                                                                            |
| `dock-indicator`     | `div`           | The drag preview overlay (insertion line or zone pane). `pointer-events: none`.                                                    |
| `drag-preview`       | `div`           | The chip that follows the pointer during a drag, showing the dragged label.                                                        |
| `separator`          | rrp `Separator` | rrp emits `data-separator` with `aria-orientation`; style splitters here.                                                          |

The `splitter` handle is dashfoo's name; react-resizable-panels also stamps the
same element with `data-separator` and an `aria-orientation` of `vertical` or
`horizontal`. Either selector works. Orientation lives on the separator, so size
the handle and pick the cursor off `[data-separator][aria-orientation="..."]`.

### Dock indicator CSS variables

The `[data-dashfoo="dock-indicator"]` overlay positions itself inline, but every
visual property reads from a CSS variable with a neutral fallback. Override them
to theme the drag preview without touching layout.

| Variable                      | Used for                 | Fallback                                       |
| ----------------------------- | ------------------------ | ---------------------------------------------- |
| `--dashfoo-dock-fill`         | indicator fill           | `oklch(0.556 0 0 / 0.18)`                      |
| `--dashfoo-dock-border`       | indicator border color   | `oklch(0.708 0 0 / 0.75)`                      |
| `--dashfoo-dock-border-width` | indicator border width   | `1px`                                          |
| `--dashfoo-dock-radius`       | indicator corner radius  | `6px`                                          |
| `--dashfoo-dock-line-radius`  | insertion-line radius    | `2px`                                          |
| `--dashfoo-dock-transition`   | indicator move animation | `left 60ms, top 60ms, width 60ms, height 60ms` |

Set `--dashfoo-dock-transition: none` to disable the indicator animation.

```css
:root {
  --dashfoo-dock-fill: rgba(255, 255, 255, 0.1);
  --dashfoo-dock-border: rgba(255, 255, 255, 0.4);
}
```

## Hooks and the store

`useDashfooStore` is what `DashfooLayout` uses internally. Reach for it when you
need the store's controls (undo/redo, raw dispatch) outside the default chrome.

```ts
const store = useDashfooStore({ defaultModel });
// store: { model, dispatch, undo, redo, canUndo, canRedo, setModel }
```

It binds an XState actor to React, normalizes the incoming model, and exposes
`dispatch` plus undo/redo. Uncontrolled mode gives full history; controlled mode
routes changes through `onModelChange` and keeps the actor in sync.

Three selector hooks read the scoped stores the primitives coordinate through.
Each takes a selector and re-renders only when the selected slice changes:

```ts
const dispatch = useLayout((state) => state.dispatch); // layout-wide config + dispatch; throws outside <DashfooLayout>/<Layout.Root>
const node = useTabset((state) => state.node); // per-tabset state; throws outside <Tabset.Root>
const { index, tab } = useTab(); // which tab a part belongs to; throws outside <Tabset.Tab>
```

`useDragSubject()` returns the live drag subject (`{ kind, id }` for a tab or
tabset being dragged) or `null` (including outside a drag layer) for
drag-aware styling in custom parts.

`useDropIntent()` returns the live drop intent (`{ targetId, location, index? }`,
where the drag would land if dropped right now) or `null` when nothing is
dragging or the pointer is over no valid target (empty space, a non-editable
layout, or a no-op drop the library suppresses). Together with
`dockZonePolygons` from `@dashfoo/core` it supports consumer-rendered drop
indicators and drop-zone visualizations alongside the built-in indicator. Both
hooks work anywhere under a layout; under a `DashfooDragProvider` they work
anywhere under the provider (the provider hosts the drag store, so widget lists
and overlays outside the layout observe the same drag).

## Build your own layout

`DashfooLayout` is a thin assembly of exported primitives; you can compose the
same parts yourself when you need custom chrome. Two compound namespaces, same
pattern as `Panel`:

| Part                    | Element                                  | Role                                                                                                                        |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Layout.Root`           | `div[data-dashfoo="layout"]`             | Creates the layout store. Takes `model`, `dispatch`, `renderTab`, and the chrome flags `DashfooLayout` accepts.             |
| `Layout.DragLayer`      | none (overlays)                          | Opts the tree into drag-dock. Omit it and everything else still works, just without dragging.                               |
| `Layout.Rows`           | rrp split tree                           | Renders a `RowNode` recursively. `renderTabset` swaps in a custom tabset composition at every leaf.                         |
| `Layout.Tabset`         | the stock `Tabset.*` composition         | The stock tabset composition, for leaves that don't need custom chrome.                                                     |
| `Layout.FloatLayer`     | overlay                                  | Wrap the tree's content to enable floating panels; renders `model.floats` as draggable overlays. Takes `floats` + `global`. |
| `Tabset.Root`           | `div[data-dashfoo="tabset"]`             | Creates the per-tabset store; owns drop registration, overflow measurement, and focus restore after close.                  |
| `Tabset.TabStrip`       | `div[data-dashfoo="tabstrip"]`           | The strip row (drag hit-testing targets this attribute).                                                                    |
| `Tabset.Tablist`        | `div[data-dashfoo="tablist"]`            | `role="tablist"` + roving-tabindex arrow/Home/End navigation.                                                               |
| `Tabset.Tab`            | `span[data-dashfoo="tab-item"]`          | Per-tab wrapper; provides identity to the parts inside.                                                                     |
| `Tabset.Trigger`        | `button[data-dashfoo="tab"]`             | The tab button: select on click, rename on double-click, draggable. Children override the label.                            |
| `Tabset.RenameInput`    | `input[data-dashfoo="tab-rename"]`       | Inline rename editor; renders only while its tab is being renamed.                                                          |
| `Tabset.CloseButton`    | `button[data-dashfoo="tab-close"]`       | Closes the tab with focus restore; hides when the tab isn't closable.                                                       |
| `Tabset.Content`        | `div[data-dashfoo="tabcontent"]`         | The `role="tabpanel"` pane(s); honors `keepMounted`. Children render-prop overrides `renderTab`.                            |
| `Tabset.Toolbar`        | `div[data-dashfoo="tabset-toolbar"]`     | Trailing toolbar container.                                                                                                 |
| `Tabset.OverflowMenu`   | menu button                              | Lists clipped tabs; hides when nothing overflows.                                                                           |
| `Tabset.Grip`           | `button[data-dashfoo="tabset-grip"]`     | Drag handle for the whole tabset; hides when tabset dragging is off.                                                        |
| `Tabset.MaximizeButton` | `button[data-dashfoo="tabset-maximize"]` | Maximize/restore toggle; hides when maximize is off.                                                                        |
| `Tabset.FloatButton`    | `button[data-dashfoo="tabset-float"]`    | Floats the tabset into a movable overlay; hides when `floatable` is off or the tabset is maximized.                         |

All parts spread native props (`className`, `style`, handlers) like `Panel`;
the structural attributes (`role`, ids, `data-dashfoo`) are applied after the
spread because drag hit-testing and overflow measurement query them.

```tsx
import { Layout, Tabset, useDashfooStore, useTab } from "@dashfoo/react";

const MyTabset = ({ node }: { node: TabsetNode }) => (
  <Tabset.Root node={node}>
    <Tabset.TabStrip>
      <Tabset.Tablist>
        {node.children.map((tab) => (
          <Tabset.Tab key={tab.id} tab={tab}>
            <Tabset.Trigger>
              <MyLabel /> {/* reads useTab()/useTabset() */}
            </Tabset.Trigger>
            <Tabset.RenameInput />
            <Tabset.CloseButton />
          </Tabset.Tab>
        ))}
      </Tabset.Tablist>
      <Tabset.Toolbar>
        <Tabset.OverflowMenu />
        <Tabset.MaximizeButton />
        <Tabset.Grip />
      </Tabset.Toolbar>
    </Tabset.TabStrip>
    <Tabset.Content />
  </Tabset.Root>
);

const MyLayout = () => {
  const store = useDashfooStore({ defaultModel });
  return (
    <Layout.Root dispatch={store.dispatch} model={store.model} renderTab={renderTab}>
      <Layout.DragLayer>
        <Layout.Rows node={store.model.layout} renderTabset={(node) => <MyTabset node={node} />} />
      </Layout.DragLayer>
    </Layout.Root>
  );
};
```

Maximize is the host's concern in a hand-built layout: when
`model.maximizedTabsetId` is set, render that tabset alone (via `findTabset`
from `@dashfoo/core`) instead of `Layout.Rows`; that's all `DashfooLayout`
does. The demo's "Raw primitives" page (`apps/demo-vite/src/pages/raw.tsx`) is
a complete working reference.

Misuse is never silent: parts outside their provider throw, and soft mistakes
(two `Tablist`s, a `Tab` whose node isn't in the tabset, renaming without a
`RenameInput`) warn with `[dashfoo]` and degrade gracefully.

## Exports

From the package root:

```ts
// Component + types
DashfooLayout;
type DashfooLayoutProps;
type DashfooHandle; // the imperative ref handle (undo/redo, addTab, resetLayout, …)
type TabComponent;

// Panel helper
Panel;
type PanelBadgeProps;
type PanelBodyProps;
type PanelHeaderProps;
type PanelIconProps;
type PanelRootProps;
type PanelTitleProps;

// Layout primitives (build your own layout)
Layout; // Layout.Root / Layout.DragLayer / Layout.Rows / Layout.Tabset
type LayoutRootProps;
type LayoutDragLayerProps;
type LayoutRowsProps;
type LayoutTabsetProps;

// Tabset primitives
Tabset; // Tabset.Root / .TabStrip / .Tablist / .Tab / .Trigger / .RenameInput / .CloseButton / .Content / .Toolbar / .OverflowMenu / .Grip / .MaximizeButton
type TabsetRootProps; // …and a Props type per part

// Store + selector hooks
useDashfooStore;
type DashfooStore;
type UseDashfooStoreOptions;
useLayout; // select from the layout store (throws outside Layout.Root/DashfooLayout)
type LayoutState;
useTabset; // select from the enclosing tabset store (throws outside Tabset.Root)
type TabsetState;
useTab; // { tab, index } identity (throws outside Tabset.Tab)
type TabContextValue;
useDragSubject; // the live drag subject, or null
useDropIntent; // where the drag would land if dropped right now, or null

// External drag sources
DashfooDragProvider; // shares one drag manager + drag store between a layout and outside sources
useExternalTabSource;
type ExternalTabSourceOptions;

// Persistence
usePersistence; // load/save primitive (the `persist` prop builds on this)
localStorageAdapter;
memoryStorageAdapter;
type StorageAdapter;
type Persistence;
type PersistConfig;

// Responsive
useContainerWidth; // [ref, width] via ResizeObserver; the hand-built building block
useResponsiveModel; // per-breakpoint model + lock flags (no remount)
matchBreakpoint; // does a breakpoint apply at a given width
activeBreakpoint; // first matching breakpoint, else the last (the catch-all)
type Breakpoint;
type ResponsiveModel; // what useResponsiveModel returns
type UseResponsiveModelOptions;
```

The document type `Dashfoo`, node types (`TabNode`, `TabsetNode`, `RowNode`),
the `Action` union, the reducer, and the serialize helpers come
from `@dashfoo/core`.

## License

MIT

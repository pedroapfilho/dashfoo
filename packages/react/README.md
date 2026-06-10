# @dashfoo/react

The React layer for dashfoo: a headless docking-layout component in the
FlexLayout / VS-Code mold — tiled, resizable, tabbed regions with drag-to-dock,
maximize, close, and inline rename.

"Headless" is the whole point. `@dashfoo/react` renders semantic markup tagged
with `data-dashfoo="..."` attributes and applies **zero** visual styling. It
sizes and positions nodes (flex, percentages, the resize handles) and wires up
roles, focus, and keyboard behavior. Everything you can see — color, borders,
radius, spacing, the look of a tab or a dock indicator — is yours to write
against the `data-dashfoo` selectors. The package owns the geometry; you own the
paint.

It builds on three engines:

- **[react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)** for splitter resize (the resize adapter is the only file that imports it).
- **[@dnd-kit/dom](https://github.com/clauderic/dnd-kit) 0.4** — the framework-agnostic core (no React bindings) — for drag (the drag adapter is the only file that touches it; pointer-only).
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

// Optional default skin — without it the chrome is unstyled (headless).
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
`[data-dashfoo="layout"]` with `display: flex; height: 100%; width: 100%` — give it
a sized parent and add your CSS (see the [attribute reference](#data-dashfoo-attribute-reference)).

## `DashfooLayout` props

| Prop                      | Type                                               | Default | Description                                                                            |
| ------------------------- | -------------------------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `model`                   | `Dashfoo`                                          | —       | Controlled document. When set, the prop is the source of truth.                        |
| `defaultModel`            | `Dashfoo`                                          | —       | Uncontrolled initial document. The component owns it from there.                       |
| `onModelChange`           | `(model: Dashfoo, action?: Action) => void`        | —       | Called after every change with the next model and the action that caused it.           |
| `components`              | `Record<string, ComponentType<{ node: TabNode }>>` | —       | Registry mapping `tab.component` keys to components.                                   |
| `factory`                 | `(tab: TabNode) => ReactNode`                      | —       | Render override. When provided, it resolves every tab and `components` is ignored.     |
| `persist`                 | `string \| { key; storage?; debounceMs? }`         | —       | Auto-save the model (uncontrolled mode only). A bare string is a localStorage key.     |
| `onAction`                | `(action: Action) => Action \| null`               | —       | Intercept each action before it commits — return it, a replacement, or `null` to veto. |
| `onActiveTabsetChange`    | `(id: string \| undefined) => void`                | —       | Fires when the active tabset changes.                                                  |
| `onMaximizedTabsetChange` | `(id: string \| undefined) => void`                | —       | Fires when a tabset is maximized or restored.                                          |
| `renderTabLabel`          | `(tab: TabNode) => ReactNode`                      | —       | Override the tab label (the accessible name stays `tab.name`).                         |
| `renderTabsetToolbar`     | `(tabset: TabsetNode) => ReactNode`                | —       | Inject custom controls into a tabset's toolbar.                                        |
| `closableTabs`            | `boolean`                                          | `true`  | Show the per-tab close control.                                                        |
| `renamableTabs`           | `boolean`                                          | `true`  | Allow double-click inline rename.                                                      |
| `maximizable`             | `boolean`                                          | `true`  | Show the tabset maximize/restore control.                                              |
| `draggableTabsets`        | `boolean`                                          | `true`  | Show the grip that drags a whole tabset.                                               |
| `keepMounted`             | `boolean`                                          | `false` | Keep inactive tab panels mounted (hidden) so their state survives a tab switch.        |

You must pass either `model` or `defaultModel`. Passing neither throws.

A `ref` exposes a `DashfooHandle` for imperative control:
`addTab`, `closeTab`, `selectTab`, `renameTab`, `maximizeTabset`, `dispatch`,
`getModel`, `undo` / `redo` / `canUndo` / `canRedo`, and `resetLayout()` (reset to
the original `defaultModel`, clearing undo history and any persisted copy).

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

### `Panel` — common panel chrome

`Panel` is an optional helper for the most common panel shape: a titled header
(with an optional leading icon and a live badge) over a scrollable body. It's
headless — it emits `data-dashfoo="panel*"` attributes and the theme styles them.

```tsx
import { Panel } from "@dashfoo/react";

const ChartPanel = ({ node }: { node: TabNode }) => (
  <Panel title={node.name} icon={<MyIcon />} live>
    {/* your content */}
  </Panel>
);
```

| Prop       | Type        | Description                                                                     |
| ---------- | ----------- | ------------------------------------------------------------------------------- |
| `title`    | `ReactNode` | Header title.                                                                   |
| `icon`     | `ReactNode` | Optional leading icon (kept a slot so the library pulls in no icon dependency). |
| `live`     | `boolean`   | Show a "Live" badge in the header.                                              |
| `children` | `ReactNode` | The scrollable body content.                                                    |

## The chrome

The component renders interactive controls into the markup. Each is plain HTML
with the right role and ARIA wiring, ready for you to style.

- **Close** — a `[data-dashfoo="tab-close"]` button next to each tab label, shown when closing is enabled. Dispatches `deleteTab`.
- **Rename** — double-click a tab to swap its label for a `[data-dashfoo="tab-rename"]` input. Enter commits, Escape cancels, blur commits. A trimmed, changed value dispatches `renameTab`; focus returns to the tab afterward.
- **Maximize** — a `[data-dashfoo="tabset-maximize"]` toggle in the tabset toolbar. Dispatches `setMaximizedTabset`; one maximized tabset fills the frame and `aria-pressed` reflects state.
- **Tabs** — roving-tabindex keyboard model (WAI-ARIA APG): Arrow keys move and select, Home/End jump to the ends, focus follows selection.
- **Drag-to-dock** — drag a tab to restack it or split a tabset (when split-dock is on). A `[data-dashfoo="dock-indicator"]` previews where it lands.

### Per-node enable flags

The three top-level chrome props are global gates. Individual nodes can opt out
through optional boolean fields in the model (a flag defaults to enabled unless
explicitly `false`). A control shows only when both the global prop and the
node's flag allow it.

| Field             | On node | Disables                                         |
| ----------------- | ------- | ------------------------------------------------ |
| `enableClose`     | tab     | the close control for that tab                   |
| `enableClose`     | tabset  | closing for every tab in the tabset              |
| `enableRename`    | tab     | double-click rename for that tab                 |
| `enableDrag`      | tab     | dragging that tab                                |
| `enableMaximize`  | tabset  | the maximize control for that tabset             |
| `enableSplitDock` | global  | splitting a tabset on drop (drops stack instead) |

```ts
{ id: "logs", type: "tab", name: "Logs", component: "logs", enableClose: false }
```

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
unmount, so the last change is never lost. It applies to uncontrolled mode only;
in controlled mode, save the model yourself in `onModelChange`.

The lower-level `usePersistence` load/save primitive (that `persist` is built on)
is also exported, for hosts that drive the store directly. See the
[persistence guide](../../docs/guides/persistence.md) for the storage seam,
validation pipeline, and SSR notes.

### Options

The full form of `persist` (`{ key, storage?, debounceMs? }`):

| Option       | Type             | Default               | Description                                       |
| ------------ | ---------------- | --------------------- | ------------------------------------------------- |
| `key`        | `string`         | — (required)          | Storage key. A bare `persist="key"` is shorthand. |
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

- `localStorageAdapter` — SSR-safe `window.localStorage`. Reads return `null` and writes are swallowed (with a warning) when storage is unavailable or throws (no window, private mode, quota exceeded). This is the default.
- `memoryStorageAdapter()` — a fresh in-memory `Map`, returned by a factory call. Good for tests and SSR previews.

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

| `data-dashfoo` value | Element         | Notes                                                                        |
| -------------------- | --------------- | ---------------------------------------------------------------------------- |
| `layout`             | root `div`      | The outer container. `display: flex` over the full parent.                   |
| `frame`              | `div`           | Wraps the resizable tree.                                                    |
| `row`                | rrp `Group`     | A resizable row/column. `orientation` comes from the node.                   |
| `splitter`           | rrp `Separator` | Resize handle between siblings (also matches `[data-separator]`, see below). |
| `tabset`             | `div`           | A tabbed region. Carries `data-drop-target` while a drag hovers it.          |
| `tabstrip`           | `div`           | The strip row: tablist plus a trailing toolbar slot.                         |
| `tablist`            | `div`           | `role="tablist"`, the tabs themselves.                                       |
| `tab-item`           | `span`          | Wraps one tab's button and its close button. `data-dragging` while dragged.  |
| `tab`                | `button`        | `role="tab"`. Carries `aria-selected` and `data-tab-id`.                     |
| `tab-close`          | `button`        | Per-tab close. `aria-label="Close <name>"`.                                  |
| `tab-rename`         | `input`         | Inline rename editor, shown during a rename.                                 |
| `tabset-toolbar`     | `div`           | Trailing controls in the strip (currently maximize).                         |
| `tabset-maximize`    | `button`        | Maximize/restore toggle. `aria-pressed` reflects state.                      |
| `tabcontent`         | `div`           | `role="tabpanel"`, the active tab's content (or empty when none).            |
| `dock-indicator`     | `div`           | The drag preview overlay (insertion line or zone). `pointer-events: none`.   |
| `separator`          | rrp `Separator` | rrp emits `data-separator` with `aria-orientation`; style splitters here.    |

The `splitter` handle is dashfoo's name; react-resizable-panels also stamps the
same element with `data-separator` and an `aria-orientation` of `vertical` or
`horizontal`. Either selector works. Orientation lives on the separator, so size
the handle and pick the cursor off `[data-separator][aria-orientation="..."]`.

### Dock indicator CSS variables

The `[data-dashfoo="dock-indicator"]` overlay positions itself inline, but every
visual property reads from a CSS variable with a neutral fallback. Override them
to theme the drag preview without touching layout.

| Variable                      | Used for                     | Fallback                    |
| ----------------------------- | ---------------------------- | --------------------------- |
| `--dashfoo-dock-fill`         | zone fill (split preview)    | `rgba(125, 125, 135, 0.18)` |
| `--dashfoo-dock-border`       | zone border color            | `rgba(160, 160, 170, 0.75)` |
| `--dashfoo-dock-border-width` | zone border width            | `1px`                       |
| `--dashfoo-dock-radius`       | zone corner radius           | `6px`                       |
| `--dashfoo-dock-line`         | tab insertion line color     | `rgb(140, 140, 150)`        |
| `--dashfoo-dock-line-radius`  | insertion line corner radius | `2px`                       |

```css
:root {
  --dashfoo-dock-fill: rgba(255, 255, 255, 0.1);
  --dashfoo-dock-border: rgba(255, 255, 255, 0.4);
  --dashfoo-dock-line: rgba(255, 255, 255, 0.85);
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

`useDashfooContext` returns the live context (`dispatch`, `renderTab`, the chrome
flags) and throws outside a `<DashfooLayout>`. Use it from a custom view.

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
type PanelProps;

// Store
useDashfooStore;
type DashfooStore;
type UseDashfooStoreOptions;

// Context
DashfooContext;
useDashfooContext;
type DashfooContextValue;

// Persistence
usePersistence; // load/save primitive (the `persist` prop builds on this)
localStorageAdapter;
memoryStorageAdapter;
type StorageAdapter;
type Persistence;
type PersistConfig;

// Responsive
useResponsiveModel;
type Breakpoint;
```

The document type `Dashfoo`, node types (`TabNode`, `TabsetNode`, `RowNode`),
the `Action` union, the reducer, and the serialize helpers come
from `@dashfoo/core`.

## License

MIT

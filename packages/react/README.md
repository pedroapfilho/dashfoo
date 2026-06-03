# @dashfoo/react

The React layer for dashfoo: a headless docking-layout component in the
FlexLayout / VS-Code mold — tiled, resizable, tabbed regions with drag-to-dock,
edge drawers, maximize, close, and inline rename.

"Headless" is the whole point. `@dashfoo/react` renders semantic markup tagged
with `data-dashfoo="..."` attributes and applies **zero** visual styling. It
sizes and positions nodes (flex, percentages, the resize handles) and wires up
roles, focus, and keyboard behavior. Everything you can see — color, borders,
radius, spacing, the look of a tab or a dock indicator — is yours to write
against the `data-dashfoo` selectors. The package owns the geometry; you own the
paint.

It builds on three engines:

- **[react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)** for splitter resize (the resize adapter is the only file that imports it).
- **[@dnd-kit/react](https://github.com/clauderic/dnd-kit) 0.4** for drag (the drag adapter is the only file that imports it).
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
import type { Dashfoo, TabNode } from "@dashfoo/core";

const model: Dashfoo = {
  version: 1,
  global: {},
  borders: [],
  layout: {
    id: "root",
    type: "row",
    orientation: "row",
    children: [
      {
        id: "ts1",
        type: "tabset",
        selected: 0,
        children: [
          { id: "t1", type: "tab", name: "Editor", component: "editor" },
          { id: "t2", type: "tab", name: "Preview", component: "preview" },
        ],
      },
    ],
  },
};

const Editor = ({ node }: { node: TabNode }) => <div>editing {node.name}</div>;
const Preview = ({ node }: { node: TabNode }) => <div>preview of {node.name}</div>;

export const App = () => (
  <DashfooLayout defaultModel={model} components={{ editor: Editor, preview: Preview }} />
);
```

Nothing renders until you style it. The container is `[data-dashfoo="layout"]`
with `display: flex; height: 100%; width: 100%` — give it a sized parent and add
your CSS (see the [attribute reference](#data-dashfoo-attribute-reference)).

## `DashfooLayout` props

| Prop            | Type                                               | Default | Description                                                                        |
| --------------- | -------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `model`         | `Dashfoo`                                          | —       | Controlled document. When set, the prop is the source of truth.                    |
| `defaultModel`  | `Dashfoo`                                          | —       | Uncontrolled initial document. The component owns it from there.                   |
| `onModelChange` | `(model: Dashfoo, action?: Action) => void`        | —       | Called after every change with the next model and the action that caused it.       |
| `components`    | `Record<string, ComponentType<{ node: TabNode }>>` | —       | Registry mapping `tab.component` keys to components.                               |
| `factory`       | `(tab: TabNode) => ReactNode`                      | —       | Render override. When provided, it resolves every tab and `components` is ignored. |
| `closableTabs`  | `boolean`                                          | `true`  | Show the per-tab close control.                                                    |
| `renamableTabs` | `boolean`                                          | `true`  | Allow double-click inline rename.                                                  |
| `maximizable`   | `boolean`                                          | `true`  | Show the tabset maximize/restore control.                                          |

You must pass either `model` or `defaultModel`. Passing neither throws.

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

## The chrome

The component renders interactive controls into the markup. Each is plain HTML
with the right role and ARIA wiring, ready for you to style.

- **Close** — a `[data-dashfoo="tab-close"]` button next to each tab label, shown when closing is enabled. Dispatches `deleteTab`.
- **Rename** — double-click a tab to swap its label for a `[data-dashfoo="tab-rename"]` input. Enter commits, Escape cancels, blur commits. A trimmed, changed value dispatches `renameTab`; focus returns to the tab afterward.
- **Maximize** — a `[data-dashfoo="tabset-maximize"]` toggle in the tabset toolbar. Dispatches `setMaximizedTabset`; one maximized tabset fills the frame and `aria-pressed` reflects state.
- **Borders** — edge drawers on the frame (left/right/top/bottom). The `[data-dashfoo="border-strip"]` holds toggle buttons; clicking one opens a `[data-dashfoo="border-drawer"]` toward the center, clicking the open one collapses it.
- **Tabs** — roving-tabindex keyboard model (WAI-ARIA APG): Arrow keys move and select, Home/End jump to the ends, focus follows selection.
- **Drag-to-dock** — drag a tab to restack it, split a tabset (when split-dock is on), or dock it to a frame edge (when border-dock is on). A `[data-dashfoo="dock-indicator"]` previews where it lands.

### Per-node enable flags

The three top-level chrome props are global gates. Individual nodes can opt out
through optional boolean fields in the model (a flag defaults to enabled unless
explicitly `false`). A control shows only when both the global prop and the
node's flag allow it.

| Field              | On node | Disables                                         |
| ------------------ | ------- | ------------------------------------------------ |
| `enableClose`      | tab     | the close control for that tab                   |
| `enableClose`      | tabset  | closing for every tab in the tabset              |
| `enableRename`     | tab     | double-click rename for that tab                 |
| `enableDrag`       | tab     | dragging that tab                                |
| `enableMaximize`   | tabset  | the maximize control for that tabset             |
| `enableBorderDock` | global  | docking a dragged tab to a frame edge            |
| `enableSplitDock`  | global  | splitting a tabset on drop (drops stack instead) |

```ts
{ id: "logs", type: "tab", name: "Logs", component: "logs", enableClose: false }
```

## Persistence

`usePersistedModel` saves an uncontrolled layout and restores it on load. It
loads once (validated and migrated through `@dashfoo/core`'s serialize, falling
back to `defaultModel` on a cache miss or corrupt value) and debounce-saves every
change.

```tsx
import { DashfooLayout, usePersistedModel } from "@dashfoo/react";

const Layout = () => {
  const persisted = usePersistedModel({ defaultModel: model, key: "my-app:layout" });

  return (
    <>
      <DashfooLayout
        key={persisted.resetKey}
        defaultModel={persisted.defaultModel}
        onModelChange={persisted.onModelChange}
        components={registry}
      />
      <button type="button" onClick={persisted.clear}>
        Reset layout
      </button>
    </>
  );
};
```

`clear()` removes the saved value and bumps `resetKey`. Using `resetKey` as the
`key` remounts `DashfooLayout` so the reset is visible. A pending save flushes on
unmount, so the last change is never lost.

### Options

| Option         | Type             | Default               | Description                      |
| -------------- | ---------------- | --------------------- | -------------------------------- |
| `defaultModel` | `Dashfoo`        | — (required)          | Fallback when nothing is stored. |
| `key`          | `string`         | — (required)          | Storage key.                     |
| `storage`      | `StorageAdapter` | `localStorageAdapter` | Where to read and write.         |
| `debounceMs`   | `number`         | `300`                 | Save debounce window.            |

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
import { memoryStorageAdapter, usePersistedModel } from "@dashfoo/react";

const persisted = usePersistedModel({
  defaultModel: model,
  key: "preview",
  storage: memoryStorageAdapter(),
});
```

## `data-dashfoo` attribute reference

Every styleable element carries a `data-dashfoo` attribute. Selectors are stable;
target them in your stylesheet. The package sets only the positioning styles it
needs inline (sizes, flex, the dock indicator's position) and leaves the rest to
you.

| `data-dashfoo` value | Element         | Notes                                                                                   |
| -------------------- | --------------- | --------------------------------------------------------------------------------------- |
| `layout`             | root `div`      | The outer container. `display: flex` over the full parent.                              |
| `frame`              | `div`           | Wraps the resizable tree; wrapped again by the border frame when the model has borders. |
| `row`                | rrp `Group`     | A resizable row/column. `orientation` comes from the node.                              |
| `splitter`           | rrp `Separator` | Resize handle between siblings (also matches `[data-separator]`, see below).            |
| `tabset`             | `div`           | A tabbed region. Carries `data-drop-target` while a drag hovers it.                     |
| `tabstrip`           | `div`           | The strip row: tablist plus a trailing toolbar slot.                                    |
| `tablist`            | `div`           | `role="tablist"`, the tabs themselves.                                                  |
| `tab-item`           | `span`          | Wraps one tab's button and its close button.                                            |
| `tab`                | `button`        | `role="tab"`. `aria-selected`, `data-tab-id`, and `data-dragging` while dragged.        |
| `tab-close`          | `button`        | Per-tab close. `aria-label="Close <name>"`.                                             |
| `tab-rename`         | `input`         | Inline rename editor, shown during a rename.                                            |
| `tabset-toolbar`     | `div`           | Trailing controls in the strip (currently maximize).                                    |
| `tabset-maximize`    | `button`        | Maximize/restore toggle. `aria-pressed` reflects state.                                 |
| `tabcontent`         | `div`           | `role="tabpanel"`, the active tab's content (or empty when none).                       |
| `border`             | `div`           | One frame edge group. `data-edge` is `left` / `right` / `top` / `bottom`.               |
| `border-strip`       | `div`           | The edge strip of toggle buttons. Carries `data-edge`.                                  |
| `border-tab`         | `button`        | One border toggle. `aria-pressed` reflects the open drawer.                             |
| `border-drawer`      | `section`       | The open drawer. `aria-label` is the tab name; carries `data-edge`.                     |
| `dock-indicator`     | `div`           | The drag preview overlay (insertion line or zone). `pointer-events: none`.              |
| `separator`          | rrp `Separator` | rrp emits `data-separator` with `aria-orientation`; style splitters here.               |

The `splitter` handle is dashfoo's name; react-resizable-panels also stamps the
same element with `data-separator` and an `aria-orientation` of `vertical` or
`horizontal`. Either selector works. Orientation lives on the separator, so size
the handle and pick the cursor off `[data-separator][aria-orientation="..."]`.

### Dock indicator CSS variables

The `[data-dashfoo="dock-indicator"]` overlay positions itself inline, but every
visual property reads from a CSS variable with a neutral fallback. Override them
to theme the drag preview without touching layout.

| Variable                      | Used for                           | Fallback                    |
| ----------------------------- | ---------------------------------- | --------------------------- |
| `--dashfoo-dock-fill`         | zone fill (split / border preview) | `rgba(125, 125, 135, 0.18)` |
| `--dashfoo-dock-border`       | zone border color                  | `rgba(160, 160, 170, 0.75)` |
| `--dashfoo-dock-border-width` | zone border width                  | `1px`                       |
| `--dashfoo-dock-radius`       | zone corner radius                 | `6px`                       |
| `--dashfoo-dock-line`         | tab insertion line color           | `rgb(140, 140, 150)`        |
| `--dashfoo-dock-line-radius`  | insertion line corner radius       | `2px`                       |

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
// store: { model, dispatch, undo, redo, canUndo, canRedo }
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
type TabComponent;

// Store
useDashfooStore;
type DashfooStore;
type UseDashfooStoreOptions;

// Context
DashfooContext;
useDashfooContext;
type DashfooContextValue;

// Persistence
usePersistedModel;
localStorageAdapter;
memoryStorageAdapter;
type StorageAdapter;
type PersistedModel;
type UsePersistedModelOptions;
```

The document type `Dashfoo`, node types (`TabNode`, `TabsetNode`, `RowNode`,
`BorderNode`), the `Action` union, the reducer, and the serialize helpers come
from `@dashfoo/core`.

## License

MIT

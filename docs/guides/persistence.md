# Persisting layouts

A dashfoo layout is a plain serializable model. The user rearranges tabs,
drags a panel to a new region, drags a splitter, and each of those changes
produces a new `Dashfoo` value. Persisting the layout means saving that
value somewhere on every change and loading it back on the next visit.

`usePersistedModel` wraps the whole loop: load once, validate and migrate
the stored payload, debounce-save every change, and flush the last save on
unmount. You spread its result onto an **uncontrolled** `DashfooLayout` and
remount on a counter so `clear()` visibly resets the tree.

```tsx
import { DashfooLayout, usePersistedModel } from "@dashfoo/react";

const persisted = usePersistedModel({ defaultModel, key: "dashfoo:my-app" });

<DashfooLayout
  defaultModel={persisted.defaultModel}
  factory={renderPanel}
  key={persisted.resetKey}
  onModelChange={persisted.onModelChange}
/>;
```

The hook lives in [`packages/react/src/persistence.ts`](../../packages/react/src/persistence.ts).
Everything below maps to that file and to the validation pipeline in
[`packages/core/src/serialize.ts`](../../packages/core/src/serialize.ts).

## The hook

```ts
type UsePersistedModelOptions = {
  debounceMs?: number;
  defaultModel: Dashfoo;
  key: string;
  storage?: StorageAdapter;
};

type PersistedModel = {
  clear: () => void;
  defaultModel: Dashfoo;
  onModelChange: (model: Dashfoo) => void;
  resetKey: number;
};

const usePersistedModel: (options: UsePersistedModelOptions) => PersistedModel;
```

| Option         | Type             | Default               | Purpose                                               |
| -------------- | ---------------- | --------------------- | ----------------------------------------------------- |
| `defaultModel` | `Dashfoo`        | required              | Model used on first visit, on a miss, or on `clear()` |
| `key`          | `string`         | required              | Storage key the model is saved under                  |
| `storage`      | `StorageAdapter` | `localStorageAdapter` | Where reads and writes go (see the seam below)        |
| `debounceMs`   | `number`         | `300`                 | Delay before a change is written                      |

The returned `defaultModel` is not your input — it is the **loaded** model,
already validated and migrated. The prop is named `defaultModel` because
that is the prop `DashfooLayout` reads when running uncontrolled, so the
return spreads onto the component directly. Pass a stable input (memoize it,
as the demo does), since it is captured once for the `clear()` fallback.

## Why uncontrolled, and why `resetKey`

`DashfooLayout` reads `defaultModel` once and then owns its own state.
That is the right mode here: the hook seeds the initial model from storage,
the component drives every interaction after that, and `onModelChange` fires
on each change so the hook can save it. You are not mirroring the model into
React state on every drag.

The catch is `clear()`. Clearing has to push a different model back into a
component that already ignored its `defaultModel` prop. The fix is the
React remount idiom: `clear()` bumps an internal counter, that counter is
returned as `resetKey`, and `resetKey` is your `key` on `DashfooLayout`.
A new `key` is a new component instance, so it reads the freshly reset
`defaultModel`. Without the `key`, `clear()` would update storage and the
hook's state but leave the rendered tree untouched.

```tsx
const persisted = usePersistedModel({ defaultModel, key: "dashfoo:my-app" });

<DashfooLayout
  defaultModel={persisted.defaultModel}
  key={persisted.resetKey} // remount on clear()
  onModelChange={persisted.onModelChange}
  factory={renderPanel}
/>;
```

## The storage seam

`storage` is the only injection point, and its shape is the three
`localStorage` methods the hook actually calls:

```ts
type StorageAdapter = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};
```

Anything matching that shape works: `localStorage`, `sessionStorage`, an
in-memory map, or a custom store that batches writes to a server. Two
adapters ship from `@dashfoo/react`.

### `localStorageAdapter` (default)

The default, and SSR-safe by construction. Every method guards
`typeof window === "undefined"` and wraps the call in `try/catch`:

- On the server, `getItem` returns `null` (so you load `defaultModel`) and
  writes are no-ops.
- In the browser, a read that throws (private mode, blocked storage)
  returns `null` rather than crashing.
- A write that throws (quota exceeded, private mode) is not swallowed
  silently — it logs `console.warn("[dashfoo] failed to persist layout", …)`.
  The layout keeps working; only persistence is degraded.

### `memoryStorageAdapter` for SSR and tests

`memoryStorageAdapter()` is a factory that returns a fresh `Map`-backed
adapter. Use it when you want isolation rather than the real browser store:

```tsx
import { memoryStorageAdapter, usePersistedModel } from "@dashfoo/react";

// In a test, or per-request on the server, get a clean store every time.
const persisted = usePersistedModel({
  defaultModel,
  key: "dashfoo:my-app",
  storage: memoryStorageAdapter(),
});
```

Call the factory once and keep the instance stable across renders (lift it
to a module constant or a `useState`/`useMemo` initializer), or each render
hands the hook a brand-new empty store and nothing persists.

## Validation and migration on load

The hook never trusts what comes out of storage. Loading runs the raw string
through `fromJSON` from `@dashfoo/core`, which is the full untrusted-input
pipeline in `serialize.ts`:

```ts
const fromJSON = (json: string): Dashfoo => parseModel(JSON.parse(json));

const parseModel = (value: unknown): Dashfoo => normalize(dashfooSchema.parse(migrate(value)));
```

Three things happen in order:

1. **`migrate`** upgrades an older payload to the current schema version.
   `CURRENT_VERSION` is `1` today, so migration just backfills a missing
   `version` field. Each future schema bump adds one step here, which keeps
   old saved layouts loadable instead of throwing on a version mismatch.
2. **`dashfooSchema.parse`** validates against the zod schema. A hand-edited,
   truncated, or corrupt payload fails here and throws.
3. **`normalize`** returns a canonical model (the same normalization the
   engine applies internally), so a valid-but-noncanonical payload loads as
   the engine would store it.

Inside the hook, a `fromJSON` that throws is caught and the model falls back
to `defaultModel`. A corrupt entry is also pruned: a mount effect re-reads
the stored value, and if it fails to parse, calls `storage.removeItem(key)`
so the bad payload does not sit there failing on every load. A user with a
broken saved layout gets the default and a clean slate, not a crash.

## Debounced save and unmount flush

`onModelChange` does not write on every keystroke of interaction. It
serializes the model with `toJSON`, stashes it as a pending write, and
schedules a flush `debounceMs` (default 300 ms) later. A burst of changes —
dragging a splitter produces many — collapses into one write.

The pending write carries the `key` it was produced for. If `key` changes
while a save is queued, the flush still writes under the original key, so a
key switch can never write the old model under the new key.

A change still in the debounce window when the component unmounts would
normally be lost. The hook prevents that with a cleanup effect that flushes
the pending write on unmount. Navigate away right after a drag and the last
change is saved.

`clear()` is the inverse: it cancels any pending timer, drops the pending
write, removes the stored key, resets the model to the captured
`defaultModel`, and bumps `resetKey`.

## Worked example: the demo persistence page

The demo's persistence route
([`apps/demo-vite/src/pages/persistence.tsx`](../../apps/demo-vite/src/pages/persistence.tsx))
is the whole pattern in one component:

```tsx
import { DashfooLayout, usePersistedModel } from "@dashfoo/react";
import { useMemo } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { playgroundModel } from "../models";

const PersistencePage = () => {
  const defaultModel = useMemo(() => playgroundModel(), []);
  const persisted = usePersistedModel({
    defaultModel,
    key: "dashfoo:demo:persistence",
  });

  return (
    <DemoStage
      actions={<Button onClick={persisted.clear}>Clear saved layout</Button>}
      description="Saved to localStorage on every change (validated and version-migrated). Rearrange it, then reload — your arrangement survives."
      title="Persistence"
    >
      <DashfooLayout
        defaultModel={persisted.defaultModel}
        factory={renderPanel}
        key={persisted.resetKey}
        onModelChange={persisted.onModelChange}
      />
    </DemoStage>
  );
};
```

Points worth copying:

- `defaultModel` is wrapped in `useMemo` so the captured fallback is stable
  across renders.
- The page passes no `storage`, so it gets `localStorageAdapter`. Rearrange
  the layout, reload, and the arrangement is restored from `localStorage`.
- "Clear saved layout" calls `persisted.clear` directly. The remount via
  `key={persisted.resetKey}` is what makes the reset visible.

## SSR safety

The default adapter is already SSR-safe, so the hook does not crash during a
server render: `getItem` returns `null`, you load `defaultModel`, and the
server and the first client render agree. The browser then loads the saved
model after mount.

If you want each request to start from an isolated store (no shared module
state between requests), pass a per-request `memoryStorageAdapter()` and
hydrate it from your own request-scoped source. For the common case —
client-side persistence to `localStorage` — the default needs no extra
wiring.

## See also

- [`packages/react/src/persistence.ts`](../../packages/react/src/persistence.ts)
  — the hook, both adapters, and the `StorageAdapter` type.
- [`packages/core/src/serialize.ts`](../../packages/core/src/serialize.ts)
  — `fromJSON` / `toJSON`, `migrate`, `parseModel`, and `CURRENT_VERSION`.
- [`apps/demo-vite/src/pages/persistence.tsx`](../../apps/demo-vite/src/pages/persistence.tsx)
  — the end-to-end worked example.

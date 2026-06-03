# Controlled mode and undo/redo

`DashfooLayout` runs in one of two modes, decided by which prop you pass.
Give it `defaultModel` and the layout owns its document: an XState actor
holds the model plus a full undo/redo history, and you can ignore the
internals. Give it `model` and `onModelChange` instead, and the prop
becomes the source of truth. Every edit routes out to you, and nothing
changes on screen until you feed a new `model` back in.

This guide covers both modes, then walks the demo's controlled page:
external history with undo/redo and a live JSON inspector.

## The two modes

The mode is mutually exclusive at the prop level.

| Mode         | Prop you pass             | Who owns the model | History       |
| ------------ | ------------------------- | ------------------ | ------------- |
| Uncontrolled | `defaultModel`            | the actor inside   | built in      |
| Controlled   | `model` + `onModelChange` | your component     | yours to keep |

Both go through `useDashfooStore`, which `DashfooLayout` calls for you.
The store's options type is the contract:

```ts
type UseDashfooStoreOptions = {
  defaultModel?: Dashfoo;
  model?: Dashfoo;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
};
```

Pass one of `model` or `defaultModel`. Passing neither throws:

```ts
// useDashfooStore requires either a `model` or a `defaultModel`.
```

## Uncontrolled: the actor owns history

This is the short path. Hand over an initial `Dashfoo` model and walk away.

```tsx
import { DashfooLayout } from "@dashfoo/react";

import { playgroundModel } from "./models";
import { renderPanel } from "./panels";

const Workspace = () => <DashfooLayout defaultModel={playgroundModel()} factory={renderPanel} />;
```

Behind the scenes the actor keeps a `History` record: `past`, `present`,
`future`, plus a `lastKey` used to coalesce drags. Every dispatched
`Action` runs through the pure `reducer` and pushes a new entry. The
store exposes `canUndo` / `canRedo` / `undo` / `redo` derived from that
history, so chrome controls can wire to them directly.

`onModelChange` is optional here. Add it and you get a read-only feed of
every committed model (and the `action` that produced it) without giving
up the actor's own history. The actor stays the source of truth.

### How drags collapse into one undo step

Resize actions are the only coalescable ones. A splitter drag emits many
actions per frame, but should undo as a single step. The history keys
them by the node being resized:

```ts
const coalesceKey = (action: Action): string | undefined => {
  if (action.type === "adjustSplit") {
    return `adjustSplit:${action.rowId}`;
  }
  return undefined;
};
```

While the key matches the previous one, `dispatch` overwrites `present`
without growing `past`. Resize a different splitter and the key changes,
which starts a fresh undo step. Everything that isn't a resize gets
`undefined` and always commits its own step.

## Controlled: the prop is the source of truth

In controlled mode you hold the model in your own state and pass it down.
The layout renders exactly what you give it and never mutates on its own.

```tsx
const Workspace = () => {
  const [model, setModel] = useState(() => playgroundModel());

  return <DashfooLayout factory={renderPanel} model={model} onModelChange={setModel} />;
};
```

The wiring inside the store makes the data flow explicit. When `model`
is set, a dispatch computes the next model with the pure reducer and
hands it to `onModelChange` rather than mutating the actor:

```ts
const dispatch = useCallback(
  (action: Action) => {
    if (controlledModel !== undefined) {
      onModelChange?.(reducer(controlledModel, action), action);
      return;
    }
    actorRef.send({ action, type: "DISPATCH" });
    onModelChange?.(actorRef.getSnapshot().context.history.present, action);
  },
  [actorRef, controlledModel, onModelChange],
);
```

Two consequences follow from this.

First, the screen does not update until your new `model` arrives. If
`onModelChange` does nothing, the layout sits still. That is the
contract: you own the model, so you decide when it changes. A `useEffect`
syncs your `model` back into the actor on every change, so the inspector
and any internal selectors still observe the current document.

Second, the actor's own undo/redo is bypassed. The store still exposes
`undo` and `redo`, but in controlled mode they operate on the actor's
internal stack, not your external one. If you want undo/redo in
controlled mode, you keep the history yourself. That's the next section.

## Models are normalized at the boundary

Whatever model enters the store gets run through `normalize` first,
whether it came from `model` or `defaultModel`:

```ts
const actorRef = useActorRef(dashfooMachine, { input: { model: normalize(initialModel) } });
```

The controlled sync does the same on every update:

```ts
actorRef.send({ model: normalize(controlledModel), type: "SET_MODEL" });
```

`normalize` enforces the same invariants the reducer guarantees: clamped
selection indexes, no empty tabsets, a live `maximizedTabsetId`. Every
entry point holds a canonical model, so a host-supplied document satisfies
the same rules as one the reducer produced. You don't have to hand-build a
perfectly-formed tree. Pass something reasonable and the boundary cleans it.

## Worked example: external history + undo/redo + inspector

The demo's controlled page is the full pattern. It keeps a `past` /
`present` / `future` record in component state, drives the layout from
`present`, and rebuilds the stack on every change.

The history shape, kept locally:

```tsx
type History = { future: Array<Dashfoo>; past: Array<Dashfoo>; present: Dashfoo };

const [history, setHistory] = useState<History>(() => ({
  future: [],
  past: [],
  present: initial,
}));
```

Each change pushes the old present onto `past` and clears `future` (a new
edit invalidates the redo branch):

```tsx
const handleChange = useCallback((model: Dashfoo): void => {
  setHistory((current) => ({
    future: [],
    past: [...current.past, current.present],
    present: model,
  }));
}, []);
```

Undo and redo move snapshots between the three stacks:

```tsx
const handleUndo = useCallback((): void => {
  setHistory((current) => {
    const previous = current.past.at(-1);
    if (!previous) {
      return current;
    }
    return {
      future: [current.present, ...current.future],
      past: current.past.slice(0, -1),
      present: previous,
    };
  });
}, []);

const handleRedo = useCallback((): void => {
  setHistory((current) => {
    const next = current.future[0];
    if (!next) {
      return current;
    }
    return {
      future: current.future.slice(1),
      past: [...current.past, current.present],
      present: next,
    };
  });
}, []);
```

This is the same algorithm `@dashfoo/core`'s `History` uses internally.
Replicating it in user space is the point of controlled mode: you decide
the policy. Cap the stack depth, persist it to a server, branch it, merge
two histories. The layout stays a pure function of `present`.

### Keyboard shortcuts

Bind undo/redo to the platform shortcuts, and skip them while the user is
typing in a field (renaming a tab, for instance):

```tsx
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
    ) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [handleRedo, handleUndo]);
```

### Layout, controls, and the inspector

`present` drives the layout. The undo/redo buttons disable on empty
stacks. The JSON inspector renders `present` straight, so it updates with
every committed change:

```tsx
<DashfooLayout
  factory={renderPanel}
  model={history.present}
  onModelChange={handleChange}
/>

<pre>{JSON.stringify(history.present, null, 2)}</pre>
```

Because `present` is the same object the layout renders from, the inspector
is exact. There is no separate projection to keep in sync. The model you
read is the model on screen.

## Choosing a mode

| Question                                            | Mode         |
| --------------------------------------------------- | ------------ |
| Do you just want a working layout with undo/redo?   | Uncontrolled |
| Do you need to persist or sync the model elsewhere? | either       |
| Do you need custom history (depth caps, branching)? | Controlled   |
| Do you need to mutate the model from outside?       | Controlled   |
| Do you want the smallest amount of wiring?          | Uncontrolled |

Start uncontrolled. Pass `defaultModel`, add `onModelChange` if you need
to observe or persist, and let the actor keep history. Move to controlled
only when you need the model to be yours: external state, a custom undo
policy, or edits driven from outside the layout.

## See also

- `apps/demo-vite/src/pages/controlled.tsx` for the end-to-end page.
- `useDashfooStore` in `@dashfoo/react` for the store wiring.
- `History`, `canUndo`, `canRedo`, and `dispatch` in `@dashfoo/core` for
  the built-in history implementation.
- `normalize` in `@dashfoo/core` for the boundary invariants.

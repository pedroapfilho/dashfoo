---
"@dashfoo/react": patch
---

One drag actor per tree instead of one per layer.

`DragProvider` (`Layout.DragLayer`) used to start its own `dragDockMachine` and attach its own listener set to the shared manager, and `FloatPanel` mounts one per float. With M floats open, a single pointer move fanned out to M+1 actors: M of them did not own the target, resolved `intent: null`, and would have swallowed the drop through the machine's `hasValidDrop` guard. Because N actors cannot be read as one value, drag state was mirrored into a module-level zustand store with hand-written equality and an ownership token to decide which actor's write won.

The actor, the manager and the listener set now live in `DashfooDragProvider`. A layer registers a scope (`{ layerId, resolveIntent, commit }`) and nothing else; the shared listener looks up the layer that owns the drop target, asks it for an intent, and routes the committed action back to that same layer. `createDragSubjectStore`, `DragSubjectStoreContext`, the null store, `sameDragSubject`, the ownership token and the 20-line mirror effect are gone.

`useDragSubject` and `useDropIntent` keep their signatures and their behaviour, including returning `null` outside a provider rather than throwing, since a component that renders both inside and outside a layout should not crash in one of them. They read the provider's actor through `useSelector`, with the same value-equality gate the mirror store applied, so a pointer move that resolves to the same slot still does not re-render their consumers.

A `Layout.DragLayer` with no `DashfooDragProvider` above it now mounts one internally (it used to create a bare manager), so hand-composed layouts keep working and also get the drag-preview overlay wiring they already had.

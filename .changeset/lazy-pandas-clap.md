---
"@dashfoo/core": minor
"@dashfoo/react": minor
---

Close the "model reaches a state no reader expects" class of bugs, and collapse
the representations that let them in.

**Fixes**

- `moveNode` and the `moveTabset` split path detached the node before checking
  that the destination resolved. An unresolvable `targetId` destroyed the tab or
  the whole tabset; `normalize` could not bring it back. Both branches now
  resolve the target first, matching what the `moveTabset` center path already
  did.
- `normalize` reconciled `maximizedTabsetId` against every tabset including
  those inside floats. `dispatch({ type: "floatTabset", tabsetId })` on the
  maximized tabset therefore rendered it twice, once as the main area's
  maximized view and once inside the float. It is now checked against the main
  layout only, so floating a maximized tabset clears maximize.
- An action that changed nothing still allocated a new model, so it spent an
  undo slot **and** cleared the redo stack. Clicking the already-selected tab
  dispatches `selectTab`, so this was ordinary traffic. `reducer` now returns its
  input by reference when nothing changed, and `history.dispatch` records
  nothing. This is not coalescing (ADR 0002): two distinct edits are still two
  entries.
- In controlled mode the XState machine ran alongside the `model` prop and kept
  its own copy. A host that vetoed or ignored an `onModelChange` left the machine
  holding a document the prop did not describe, and the next dispatch was
  computed from that shadow copy. The mode is now latched at mount and only one
  source is ever read.
- Compact mode stripped `maximizedTabsetId` via `stackModel` but still published
  `maximizable: true`, so the Maximize button was live, did nothing visible, and
  then applied itself when the container widened.
- `Tabset`'s post-close focus restore was an unanchored boolean. A vetoed
  `deleteTab` left it set, and the next unrelated dispatch stole focus.
- `snapEnabled` approximated the snap grid from the raw config without seeing
  the panel count, so `{ step: 100 }` (and `{ divisions: "panels" }` on a
  one-panel row) reported snapping on for a row with no reachable target and
  armed the per-move snap path.

**Breaking**

- Tree helpers are model-scoped: `findRow(model, id)` and
  `findTabsetParent(model, tabsetId)` no longer take a `RowNode` root. Matching
  is predicate-first, so an id shared by nodes of different kinds can no longer
  make two helpers disagree.
- `resolveDockTarget` returns a `DockLocation` instead of a `DockTarget`.
  `DockTarget` and `dockLocationFor` are gone.
- The snap functions take a resolved `SnapGrid` (new `resolveSnapGrid`) rather
  than a `SnapConfig`, and `snapEnabled(grid)` is a check on that grid.
- `moveTabset` actions no longer carry `index`; the reducer never read it.
- `dragDockMachine`'s context is one `DragState` union, `OVER` carries
  `{ drop: DropResolution | null }`, and `COMMIT` echoes the resolving `scope`.
  New: `dropAction`, `DragState`, `DropResolution`. The machines barrel exports
  named symbols instead of `export *`, so `DashfooContext`, `DashfooEvent`,
  `DashfooMachineInput`, `DragContext`, `DragEmitted` and `DragEvent` are no
  longer public (`DragContext` collided with the React context of the same name
  in `@dashfoo/react`).
- `DashfooLayoutProps` is a discriminated union: `model` XOR
  `defaultModel`, and `persist` only alongside `defaultModel`. The combinations
  that used to type-check and silently do nothing no longer compile.
  `DashfooLayoutCommonProps` is exported for helpers that spread overrides.
- The controlled `model` prop is normalized before render, and `setModel` /
  `resetLayout` warn once instead of silently doing nothing.
- `TabsetState.restoreFocus` is now `pendingCloseTabId: string | null`.

**Internals**

- `normalize` prunes in one pass that reports the tabsets it kept, instead of
  walking every root three times with two restatements of the pruning rule.
- `RowNode` is one self-referential zod schema (zod 4 getter recursion) instead
  of three hand-maintained declarations of the same shape.
- `placeBesideTarget` no longer accepts the `center` it cannot implement, and
  drives split geometry from an exhaustiveness-checked table rather than
  geometry's nullable `splitEdge`.
- Resolving a drop makes one DOM pass over the target tab strip instead of
  three, and `dragmove`/`collision` coalesce into one resolve per frame.
- An overflowing tab strip no longer re-renders its tabset on every scroll frame.
- The persisted layout is read and parsed once on mount, not twice with two
  different answers for an unreadable value.
- Toolbar visibility is one `useTabsetChrome()` record, so the layout and the
  controls cannot disagree (they did: only the float button knew about
  `hasFloatLayer`, so a floatable tabset without a `Layout.FloatLayer` drew an
  empty toolbar).
- Tab arrow-keys step from the visual selection, which is where focus actually
  sits during a drag.

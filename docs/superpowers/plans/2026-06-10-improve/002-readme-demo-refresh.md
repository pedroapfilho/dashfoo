# Plan 002: Fix the stale root README (demo + drag sections) and unify the demo reset pattern

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 912bf52..HEAD -- README.md apps/demo-vite/src/pages/docking.tsx` —
> NOTE: written against commit `912bf52` **plus uncommitted feature work**
> (the demo was restructured from seven pages to three in that uncommitted
> work). Trust the "Current state" excerpts; mismatch = STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `912bf52` (+ uncommitted tree), 2026-06-10

## Why this matters

The demo was just consolidated from seven pages to three (overview with
persistence, docking with an external widget marketplace, imperative control),
and external drag sources became a public API — but the root `README.md`, the
project's front door, still advertises seven pages and describes the drag
adapter as committing only `moveNode`/`moveTabset`. Stale docs are actively
wrong. While in the demo, the docking page also uses a remount-key reset while
the overview uses the imperative `resetLayout()` — two patterns for one job
confuses anyone reading the demo as reference code.

## Current state

- `README.md:238` (Demo section) reads:

  > `apps/demo-vite` is a neutral TanStack Router showcase that drives dashfoo across seven pages: an overview, a docking sandbox, the tabset chrome, persistence, controlled mode, responsive restructuring, and panel sizing.

  The actual pages (check `apps/demo-vite/src/pages/`) are `overview.tsx`
  (composite layout, persisted to localStorage under `dashfoo:demo:overview`,
  "Clear saved layout" action), `docking.tsx` (docking sandbox + widget
  marketplace: drag widgets in from outside via `useExternalTabSource`, or add
  via button; tabset "a" has `min: 180` demonstrating sizing constraints), and
  `controlled.tsx` (imperative handle: undo/redo, add/remove widgets, live
  model inspector).

- `README.md` ~line 175 ("The react adapters" section) reads:

  > …forwards the lifecycle into the dock machine via `resolveDockTarget`, and commits `moveNode` (a tab drag) or `moveTabset` (a tabset dragged by its grip).

  Missing: external sources commit `addNode` (drag a new tab in from outside
  the layout via `DashfooDragProvider` + `useExternalTabSource` — this is
  documented in `packages/react/README.md` § "External drag sources" and
  `apps/docs/content/docs/drag-and-dock.mdx` § "Dragging in from outside";
  match their terminology).

- `apps/demo-vite/src/pages/docking.tsx` — reset via remount key:

  ```tsx
  const [resetKey, setResetKey] = useState(0);
  const layout = useRef<DashfooHandle>(null);

  const handleReset = (): void => {
    setResetKey((value) => value + 1);
  };
  // …
  <DashfooLayout defaultModel={dockingModel()} factory={renderPanel} key={resetKey} ref={layout} />;
  ```

  while `apps/demo-vite/src/pages/overview.tsx` uses the imperative API:

  ```tsx
  const handleClear = (): void => layout.current?.resetLayout();
  ```

  `resetLayout()` (on `DashfooHandle`, see `packages/react/src/components/dashfoo-layout.tsx`)
  resets the live model to `defaultModel`, clears undo history and any
  persisted copy — docking has no `persist`, so it is a drop-in replacement
  for the remount.

- No Playwright spec clicks the docking "Reset layout" button (verify:
  `grep -rn '"Reset layout"' apps/demo-vite/e2e/` → no hits), so the swap is
  e2e-safe.

## Commands you will need

| Purpose             | Command                                                                                                                                        | Expected on success |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Lint                | `pnpm lint`                                                                                                                                    | exit 0              |
| Typecheck           | `pnpm typecheck`                                                                                                                               | exit 0              |
| Format check        | `pnpm format:check`                                                                                                                            | exit 0              |
| E2E (docking specs) | `pnpm --filter demo-vite exec playwright test e2e/external-drag.spec.ts e2e/sizing.spec.ts e2e/tabset-drag.spec.ts e2e/insertion-line.spec.ts` | all pass            |

(E2E prerequisite, once: `pnpm --filter demo-vite exec playwright install --with-deps chromium`; the Playwright config starts its own Vite server on port 5174.)

## Scope

**In scope**:

- `README.md` (two sections: Demo paragraph; react-adapters drag sentence)
- `apps/demo-vite/src/pages/docking.tsx` (reset pattern only)

**Out of scope**:

- `packages/react/README.md`, `packages/core/README.md`, `apps/docs/**` — already updated for the new API; don't touch.
- `apps/demo-vite/src/pages/overview.tsx`, `controlled.tsx` — already use the target pattern.
- Any library source under `packages/`.

## Git workflow

- Branch: current feature branch if instructed, else `advisor/002-readme-demo-refresh`.
- Commit style: `docs: refresh README demo section for the three-page demo` (+ `refactor(demo): reset docking layout via resetLayout()` if committed separately).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Rewrite the README Demo paragraph

Replace the "seven pages" sentence at `README.md:238` with an accurate
three-page description, e.g.:

> `apps/demo-vite` is a neutral TanStack Router showcase across three pages: an overview (a composite layout persisted to localStorage — rearrange, reload, it survives), a docking sandbox with a widget marketplace (drag widgets into the layout from outside it, or add them with a button), and an imperative-control page (undo/redo, add/remove widgets, live model inspector).

**Verify**: `grep -n "seven pages" README.md` → no matches.

### Step 2: Mention external drag sources in the drag-adapter sentence

Extend the `moveNode`/`moveTabset` sentence (~`README.md:175`) so it also says
the adapter commits `addNode` for external sources, naming
`DashfooDragProvider` + `useExternalTabSource`, with a link to
`https://docs.dashfoo.dev/drag-and-dock` (the link already appears in that
paragraph — keep one link, don't duplicate).

**Verify**: `grep -n "useExternalTabSource" README.md` → exactly one match in that section.

### Step 3: Swap docking reset to the imperative API

In `apps/demo-vite/src/pages/docking.tsx`: delete `resetKey`/`setResetKey` and
the `key={resetKey}` prop; change `handleReset` to
`layout.current?.resetLayout();`. Remove the now-unused `useState` import if
nothing else uses it. The `layout` ref already exists.

**Verify**: `pnpm lint && pnpm typecheck` → exit 0; `grep -n "resetKey" apps/demo-vite/src/pages/docking.tsx` → no matches.

### Step 4: Run the docking e2e specs

**Verify**: the four spec files listed in the commands table pass.

## Test plan

No new tests. Existing docking-page e2e specs (external-drag, sizing,
tabset-drag, insertion-line) are the regression net for step 3; steps 1–2 are
prose-only.

## Done criteria

- [ ] `grep -n "seven pages" README.md` → no matches
- [ ] `grep -c "useExternalTabSource" README.md` → 1
- [ ] `grep -n "resetKey" apps/demo-vite/src/pages/docking.tsx` → no matches
- [ ] `pnpm lint && pnpm typecheck && pnpm format:check` → exit 0
- [ ] Docking e2e specs pass
- [ ] `git status` shows only the two in-scope files (+ `plans/README.md`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The README Demo paragraph already describes three pages (someone fixed it) — report and skip steps 1–2.
- `resetLayout()` after step 3 visibly does NOT restore the docking page's default layout when clicked (manual check via `pnpm --filter demo-vite dev`, page `/docking`) — revert step 3 and report; the handle's reset semantics would then differ from this plan's assumption.
- Any e2e spec fails after step 3.

## Maintenance notes

- The README Demo paragraph will go stale again whenever demo pages change — the demo restructure that caused this miss updated `apps/docs` and package READMEs but not the root README. Reviewers: check root README on any demo-page PR.
- If a "Reset layout" e2e is ever added, target the button by role/name; both demo reset buttons now share the `resetLayout()` path.

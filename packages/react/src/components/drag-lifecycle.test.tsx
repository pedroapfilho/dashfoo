/*
 * Step 1: Assertable surface of DragDropManager (@dnd-kit/dom@0.5.0)
 *
 * Sources read:
 *   node_modules/.pnpm/@dnd-kit+dom@0.5.0/node_modules/@dnd-kit/dom/index.d.ts
 *   node_modules/.pnpm/@dnd-kit+abstract@0.5.0/node_modules/@dnd-kit/abstract/index.d.ts
 *   node_modules/.pnpm/@dnd-kit+dom@0.5.0/node_modules/@dnd-kit/dom/index.js   (runtime)
 *   node_modules/.pnpm/@dnd-kit+abstract@0.5.0/node_modules/@dnd-kit/abstract/index.js (runtime)
 *
 * Q1 — Registry of draggables readable?
 *   YES. `manager.registry: DragDropRegistry` exposes:
 *     - `draggables: EntityRegistry<T>` with `.has(id)` and `.get(id)`
 *     - `sensors: PluginRegistry` with `.values: SensorInstance[]`
 *   Entity.register() is called via `queueMicrotask` from the constructor, so
 *   `registry.draggables.has(id)` is only true AFTER a microtask flush (test
 *   step 4 awaits accordingly). Sensor instances are registered synchronously
 *   during `new DragDropManager({...})` construction — `registry.sensors.values`
 *   is immediately non-empty.
 *
 * Q2 — Observable "destroyed / disposed" state?
 *   No explicit `.destroyed` flag. The chosen liveness signal is
 *   `manager.registry.sensors.values.length > 0`:
 *   - At construction, `PointerSensor` is registered synchronously via the
 *     `sensors` config passed to `DragDropManager`.
 *   - `manager.destroy()` calls `registry.destroy()` → `registry.sensors.destroy()`
 *     → `PluginRegistry.destroy()` clears `this.instances` (a plain Map).
 *   After `destroy()`, `registry.sensors.values` returns `[]`.
 *
 *   NOTE: `monitor.addEventListener` does NOT throw after destroy — it silently
 *   writes to the monitor's unchanged internal registry. The monitor cannot serve
 *   as a liveness probe.
 *
 *   NOTE: `useInsertionEffect` cleanup is NOT double-invoked by React 18/19
 *   StrictMode. Verified in react-dom source: `doubleInvokeEffectsOnFiber` calls
 *   only `disappearLayoutEffects` (Layout flag) and `disconnectPassiveEffect`
 *   (Passive flag). The `Insertion` flag is excluded from the double-invoke pass.
 *   Therefore `useInsertionEffect(() => () => manager.destroy(), [manager])` does
 *   NOT fire its cleanup during StrictMode's simulated unmount — the manager stays
 *   live. If changed to `useEffect` (Passive flag), StrictMode double-fires the
 *   cleanup and the manager is dead after initial mount. Test 3 regresses on that
 *   change.
 *
 * Q3 — Draggable construction safe in jsdom?
 *   YES. `new Draggable({ id, data }, manager)` defers all sensor bindings to
 *   effects that run when `element` is set and registration completes. When we
 *   omit `element`, no DOM APIs are called. `new DragDropManager({...})`
 *   initialises ScrollListener, Scroller, StyleInjector; none of those call
 *   document/window APIs in their constructors — only during active drags.
 */

import type { DragDropManager } from "@dnd-kit/dom";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { StrictMode, useContext } from "react";
import { describe, expect, test } from "vitest";

import { DragContext, SharedDragManagerContext } from "../hooks/drag-hooks";

import { DragProvider } from "./drag-adapter";
import { DashfooDragProvider } from "./drag-root";

// Checks whether the manager's sensor registry is non-empty. PointerSensor is
// registered synchronously at construction time. After `manager.destroy()`,
// `registry.sensors.destroy()` clears the internal Map and .values returns [].
// This is the liveness signal described in Q2 above.
const isManagerLive = (manager: DragDropManager): boolean =>
  manager.registry.sensors.values.length > 0;

// Step 2: shared vs own manager selection
describe("shared vs own manager selection", () => {
  test("standalone DragProvider creates its own non-null manager", () => {
    let capturedManager: DragDropManager | null = null;

    const Probe = (): null => {
      const ctx = useContext(DragContext);
      capturedManager = ctx?.manager ?? null;
      return null;
    };

    render(
      <DragProvider onCommit={() => {}}>
        <Probe />
      </DragProvider>,
    );

    expect(capturedManager).not.toBeNull();
  });

  test("DragProvider under DashfooDragProvider uses the shared manager (same instance)", () => {
    let sharedManager: DragDropManager | null = null;
    let innerManager: DragDropManager | null = null;

    const OuterProbe = ({ children }: { children: ReactNode }): ReactNode => {
      sharedManager = useContext(SharedDragManagerContext);
      return children;
    };

    const InnerProbe = (): null => {
      const ctx = useContext(DragContext);
      innerManager = ctx?.manager ?? null;
      return null;
    };

    render(
      <DashfooDragProvider>
        <OuterProbe>
          <DragProvider onCommit={() => {}}>
            <InnerProbe />
          </DragProvider>
        </OuterProbe>
      </DashfooDragProvider>,
    );

    expect(sharedManager).not.toBeNull();
    expect(innerManager).not.toBeNull();
    // The exact same instance must be used — not a copy.
    expect(innerManager).toBe(sharedManager);
  });
});

// Step 3: StrictMode survival
describe("StrictMode survival", () => {
  test("DashfooDragProvider: manager survives StrictMode double-mount and stays live", () => {
    // Collects every manager the Probe sees across all renders.
    const seen: Array<DragDropManager | null> = [];

    const Probe = (): null => {
      const manager = useContext(SharedDragManagerContext);
      seen.push(manager);
      return null;
    };

    render(
      <StrictMode>
        <DashfooDragProvider>
          <Probe />
        </DashfooDragProvider>
      </StrictMode>,
    );

    // All collected instances must be the same object. StrictMode double-invokes
    // render() but useState's factory runs only once — same manager throughout.
    const unique = new Set(seen.filter(Boolean));
    expect(unique.size).toBe(1);

    const manager = [...unique][0]!;

    // The manager must still be live after the full StrictMode double-mount.
    // useInsertionEffect cleanup is NOT double-invoked, so the PointerSensor
    // installed at construction is still in the registry.
    // If useInsertionEffect were changed to useEffect, StrictMode would fire the
    // cleanup during simulated unmount, calling manager.destroy() → clearing
    // registry.sensors. isManagerLive would return false and this test would fail.
    expect(isManagerLive(manager)).toBe(true);
  });

  test("standalone DragProvider: own manager survives StrictMode double-mount and stays live", () => {
    const seen: Array<DragDropManager | null> = [];

    const Probe = (): null => {
      const ctx = useContext(DragContext);
      seen.push(ctx?.manager ?? null);
      return null;
    };

    render(
      <StrictMode>
        <DragProvider onCommit={() => {}}>
          <Probe />
        </DragProvider>
      </StrictMode>,
    );

    const unique = new Set(seen.filter(Boolean));
    expect(unique.size).toBe(1);

    const manager = [...unique][0]!;
    expect(isManagerLive(manager)).toBe(true);
  });
});

// Step 4: useExternalTabSource registration lifecycle (feasibility-gated)
// Registry IS readable (see Q1 above), but Entity.register() is deferred via
// queueMicrotask. We await Promise.resolve() to flush the microtask queue
// before asserting registration, and unmount to trigger the useEffect cleanup.

describe("useExternalTabSource lifecycle", () => {
  test("registers a Draggable on mount and removes it on unmount", async () => {
    const { useExternalTabSource } = await import("../hooks/drag-hooks");

    let capturedManager: DragDropManager | null = null;
    let capturedId: string | null = null;

    const ExternalSource = (): ReactNode => {
      capturedManager = useContext(SharedDragManagerContext);

      const { ref } = useExternalTabSource({
        createTab: () => ({ component: "widget", id: "w1", name: "Widget", type: "tab" as const }),
        label: "Widget",
      });

      return <div data-testid="source" ref={ref as React.RefCallback<HTMLDivElement>} />;
    };

    const { unmount } = render(
      <DashfooDragProvider>
        <ExternalSource />
      </DashfooDragProvider>,
    );

    // Entity registration is deferred via queueMicrotask; flush it.
    await Promise.resolve();

    expect(capturedManager).not.toBeNull();
    const draggables = [...capturedManager!.registry.draggables];
    expect(draggables.length).toBeGreaterThanOrEqual(1);
    capturedId = String(draggables[0].id);

    // Unmount triggers the useEffect cleanup which calls draggable.destroy() →
    // entity.unregister() → EntityRegistry removes it from the Map.
    unmount();

    expect(capturedManager!.registry.draggables.has(capturedId)).toBe(false);
  });
});

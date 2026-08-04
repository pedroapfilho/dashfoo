import type { DragDropManager } from "@dnd-kit/dom";
import { Feedback } from "@dnd-kit/dom";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { StrictMode, useContext } from "react";
import { describe, expect, test } from "vitest";

import type { DragActor } from "../hooks/drag-hooks";
import {
  DragContext,
  DragRootContext,
  SharedDragManagerContext,
  useDragSubject,
  useDropIntent,
} from "../hooks/drag-hooks";

import { DragProvider } from "./drag-adapter";
import { DashfooDragProvider } from "./drag-root";

const isManagerLive = (manager: DragDropManager): boolean =>
  manager.registry.sensors.values.length > 0;

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

    expect(innerManager).toBe(sharedManager);
  });
});

describe("one actor per tree", () => {
  test("sibling layers under one root read the same drag actor", () => {
    const seen: Array<DragActor | undefined> = [];

    const Probe = (): null => {
      seen.push(useContext(DragContext)?.actorRef);
      return null;
    };

    render(
      <DashfooDragProvider>
        <DragProvider onCommit={() => {}}>
          <Probe />
        </DragProvider>
        <DragProvider onCommit={() => {}}>
          <Probe />
        </DragProvider>
      </DashfooDragProvider>,
    );

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBeDefined();
    expect(new Set(seen).size).toBe(1);
  });

  test("a reader mounted beside a layer still reaches the actor the layer uses", () => {
    let outside: DragActor | undefined;
    let inside: DragActor | undefined;

    const OutsideProbe = (): null => {
      outside = useContext(DragRootContext)?.actorRef;
      return null;
    };

    const InsideProbe = (): null => {
      inside = useContext(DragContext)?.actorRef;
      return null;
    };

    render(
      <DashfooDragProvider>
        <OutsideProbe />
        <DragProvider onCommit={() => {}}>
          <InsideProbe />
        </DragProvider>
      </DashfooDragProvider>,
    );

    expect(outside).toBeDefined();
    expect(outside).toBe(inside);
  });

  test("the drag readers report an empty state outside any provider", () => {
    let subject: unknown = "unset";
    let intent: unknown = "unset";

    const Probe = (): null => {
      subject = useDragSubject();
      intent = useDropIntent();
      return null;
    };

    render(<Probe />);

    expect(subject).toBeNull();
    expect(intent).toBeNull();
  });
});

describe("StrictMode survival", () => {
  test("DashfooDragProvider: manager survives StrictMode double-mount and stays live", () => {
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

    const unique = new Set(seen.filter(Boolean));
    expect(unique.size).toBe(1);

    const manager = [...unique][0]!;

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

      return <div data-testid="source" ref={ref} />;
    };

    const { unmount } = render(
      <DashfooDragProvider>
        <ExternalSource />
      </DashfooDragProvider>,
    );

    await Promise.resolve();

    expect(capturedManager).not.toBeNull();
    const draggables = [...capturedManager!.registry.draggables];
    expect(draggables.length).toBeGreaterThanOrEqual(1);
    capturedId = String(draggables[0].id);

    unmount();

    expect(capturedManager!.registry.draggables.has(capturedId)).toBe(false);
  });
});

const droppablesFor = (
  manager: DragDropManager,
  tabsetId: string,
): Array<{ data: unknown; element?: Element; id: string | number }> =>
  [...manager.registry.droppables].filter(
    (droppable) => (droppable.data as { tabsetId?: string }).tabsetId === tabsetId,
  );

describe("useTabsetDroppable lifecycle", () => {
  test("registers a Droppable carrying the layer + model ids, and removes it on unmount", async () => {
    const { useTabsetDroppable } = await import("../hooks/drag-hooks");

    let capturedManager: DragDropManager | null = null;

    const Tabset = (): ReactNode => {
      const ctx = useContext(DragContext);
      capturedManager = ctx?.manager ?? null;
      const { ref } = useTabsetDroppable("ts1");
      return <div ref={ref} />;
    };

    const { unmount } = render(
      <DragProvider onCommit={() => {}}>
        <Tabset />
      </DragProvider>,
    );

    await Promise.resolve();

    expect(capturedManager).not.toBeNull();
    const [droppable] = droppablesFor(capturedManager!, "ts1");
    expect(droppable).toBeDefined();

    expect((droppable.data as { layerId?: string }).layerId).toBeTruthy();
    expect(droppable.element).toBeInstanceOf(HTMLElement);

    unmount();

    expect(droppablesFor(capturedManager!, "ts1").length).toBe(0);
  });

  test("sibling layers reusing a model tabset id keep distinct registrations", async () => {
    const { useTabsetDroppable } = await import("../hooks/drag-hooks");

    let capturedManager: DragDropManager | null = null;

    const Probe = (): null => {
      capturedManager = useContext(SharedDragManagerContext);
      return null;
    };

    const Tabset = (): ReactNode => {
      const { ref } = useTabsetDroppable("ts1");
      return <div ref={ref} />;
    };

    render(
      <DashfooDragProvider>
        <Probe />
        <DragProvider onCommit={() => {}}>
          <Tabset />
        </DragProvider>
        <DragProvider onCommit={() => {}}>
          <Tabset />
        </DragProvider>
      </DashfooDragProvider>,
    );

    await Promise.resolve();

    const registered = droppablesFor(capturedManager!, "ts1");
    expect(registered.length).toBe(2);
    expect(new Set(registered.map((droppable) => droppable.id)).size).toBe(2);
  });
});

describe("Feedback overlay wiring", () => {
  test("shared provider mounts exactly one overlay and hands it to Feedback; nested layers add none", () => {
    let sharedManager: DragDropManager | null = null;

    const Probe = (): null => {
      sharedManager = useContext(SharedDragManagerContext);
      return null;
    };

    render(
      <DashfooDragProvider>
        <Probe />
        <DragProvider onCommit={() => {}}>
          <div />
        </DragProvider>
        <DragProvider onCommit={() => {}}>
          <div />
        </DragProvider>
      </DashfooDragProvider>,
    );

    const wrappers = document.querySelectorAll("[data-dnd-overlay]");
    expect(wrappers.length).toBe(1);

    const feedback = sharedManager!.registry.plugins.get(Feedback);
    expect(feedback).toBeDefined();
    expect(feedback!.overlay).toBe(wrappers[0]);
  });

  test("standalone DragProvider wires its own manager's Feedback to its own overlay", () => {
    let ownManager: DragDropManager | null = null;

    const Probe = (): null => {
      const ctx = useContext(DragContext);
      ownManager = ctx?.manager ?? null;
      return null;
    };

    render(
      <DragProvider onCommit={() => {}}>
        <Probe />
      </DragProvider>,
    );

    const wrappers = document.querySelectorAll("[data-dnd-overlay]");
    expect(wrappers.length).toBe(1);
    expect(ownManager!.registry.plugins.get(Feedback)!.overlay).toBe(wrappers[0]);
  });

  test("the overlay assignment survives StrictMode double-mount", () => {
    let sharedManager: DragDropManager | null = null;

    const Probe = (): null => {
      sharedManager = useContext(SharedDragManagerContext);
      return null;
    };

    render(
      <StrictMode>
        <DashfooDragProvider>
          <Probe />
        </DashfooDragProvider>
      </StrictMode>,
    );

    const wrappers = document.querySelectorAll("[data-dnd-overlay]");
    expect(wrappers.length).toBe(1);

    expect(sharedManager!.registry.plugins.get(Feedback)!.overlay).toBe(wrappers[0]);
  });
});

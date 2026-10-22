import type { Dashfoo, TabNode } from "@dashfoo/core";
import { Feedback } from "@dnd-kit/dom";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { StrictMode, useContext } from "react";
import { assert, beforeEach, describe, expect, test, vi } from "vitest";

import { Layout } from "../components/layout";
import { useDashfooStore } from "../hooks/store";

import type { DragContextValue } from "./drag-context";
import { DragContext } from "./drag-context";
import {
  useDragSubject,
  useDropIntent,
  useExternalTabSource,
  useTabsetDroppable,
} from "./drag-hooks";
import type { DashfooDragManager } from "./drag-manager";
import { DashfooDragProvider } from "./drag-root";

const isManagerLive = (manager: DashfooDragManager): boolean =>
  manager.registry.sensors.values.length > 0;

const tabset = (id: string, tabId: string, weight = 100) => ({
  children: [{ component: "probe", id: tabId, name: tabId, type: "tab" as const }],
  id,
  selected: 0,
  type: "tabset" as const,
  weight,
});

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [
    {
      geometry: { height: 300, left: 40, top: 40, width: 400 },
      id: "f1",
      layout: {
        children: [tabset("f1-ts", "float-tab")],
        id: "f1-row",
        orientation: "row",
        type: "row",
        weight: 1,
      },
      name: "Panel",
      type: "float",
    },
  ],
  global: {},
  layout: {
    children: [tabset("ts1", "main-tab", 50), tabset("ts2", "side-tab", 50)],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

const contexts = new Map<string, DragContextValue | null>();

beforeEach(() => {
  contexts.clear();
});

const ContextProbe = ({ id }: { id: string }): null => {
  contexts.set(id, useContext(DragContext));

  return null;
};

const renderTab = (tab: TabNode): ReactNode => <ContextProbe id={tab.id} />;

const HandBuiltLayout = ({ withDragLayer = true }: { withDragLayer?: boolean }): ReactNode => {
  const store = useDashfooStore({ defaultModel: model() });
  const rows = <Layout.Rows node={store.model.layout} />;

  return (
    <Layout.Root dispatch={store.dispatch} model={store.model} renderers={{ tab: renderTab }}>
      <Layout.FloatLayer floats={store.model.floats}>
        {withDragLayer ? <Layout.DragLayer>{rows}</Layout.DragLayer> : rows}
      </Layout.FloatLayer>
    </Layout.Root>
  );
};

const captured = (id: string): DragContextValue => {
  const value = contexts.get(id);
  assert(value, `no drag context reached "${id}"`);

  return value;
};

const tabsetDroppables = (manager: DashfooDragManager) =>
  [...manager.registry.droppables].map((droppable) => droppable.data);

describe("one drag root per layout", () => {
  test("a hand-built Layout.Root shares one manager and one actor between the main layer and floats", async () => {
    render(<HandBuiltLayout />);
    await Promise.resolve();

    const main = captured("main-tab");
    const float = captured("float-tab");
    expect(float.manager).toBe(main.manager);
    expect(float.actorRef).toBe(main.actorRef);
    expect(main.layerId).not.toBeNull();
    expect(float.layerId).not.toBeNull();
    expect(float.layerId).not.toBe(main.layerId);

    const sources = [...main.manager.registry.draggables].filter(
      (source) => source.data.type === "tab",
    );

    expect(new Set(sources.map((source) => source.data.documentId)).size).toBe(1);
    expect(sources[0]?.data.documentId).toBeTruthy();

    const tabsetIds = tabsetDroppables(main.manager).map((data) => data.tabsetId);
    expect(tabsetIds).toEqual(expect.arrayContaining(["ts1", "ts2", "f1-ts"]));
    expect(document.querySelectorAll("[data-dnd-overlay]")).toHaveLength(1);
  });

  test("the root survives a StrictMode double mount and stays live", () => {
    render(
      <StrictMode>
        <HandBuiltLayout />
      </StrictMode>,
    );

    const { manager } = captured("main-tab");
    expect(captured("float-tab").manager).toBe(manager);
    expect(isManagerLive(manager)).toBe(true);
  });

  test("a layout under DashfooDragProvider reuses the provider's root", () => {
    render(
      <DashfooDragProvider>
        <ContextProbe id="outside" />
        <HandBuiltLayout />
      </DashfooDragProvider>,
    );

    const outside = captured("outside");
    expect(outside.layerId).toBeNull();
    expect(captured("main-tab").manager).toBe(outside.manager);
    expect(captured("float-tab").actorRef).toBe(outside.actorRef);
    expect(document.querySelectorAll("[data-dnd-overlay]")).toHaveLength(1);
  });

  test("a nested root clears the enclosing layer and reuses its manager", () => {
    render(<HandBuiltLayout />);
    const outer = captured("main-tab");
    render(
      <DragContext.Provider value={outer}>
        <DashfooDragProvider>
          <ContextProbe id="nested" />
        </DashfooDragProvider>
      </DragContext.Provider>,
    );

    const nested = captured("nested");
    expect(nested.layerId).toBeNull();
    expect(nested.manager).toBe(outer.manager);
  });

  test("without a Layout.DragLayer, tabs register no draggables and tabsets no droppables", async () => {
    render(<HandBuiltLayout withDragLayer={false} />);
    await Promise.resolve();

    const { manager } = captured("main-tab");
    const draggableIds = [...manager.registry.draggables].map((draggable) => String(draggable.id));
    expect(draggableIds.some((id) => id.includes("main-tab"))).toBe(false);
    expect(tabsetDroppables(manager).map((data) => data.tabsetId)).not.toContain("ts1");
  });

  test("the drag readers report an empty state outside any root", () => {
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

  test("a Layout.DragLayer outside a Layout.Root warns and renders its children", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <Layout.DragLayer>
        <span>child</span>
      </Layout.DragLayer>,
    );

    expect(screen.getByText("child")).toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Layout.DragLayer"));
    warn.mockRestore();
  });
});

const ExternalSource = (): ReactNode => {
  const { ref } = useExternalTabSource({
    createTab: () => ({ component: "widget", id: "w1", name: "Widget", type: "tab" }),
    label: "Widget",
  });

  return <div ref={ref} />;
};

describe("useExternalTabSource", () => {
  test("registers a Draggable on mount and removes it on unmount", async () => {
    const { unmount } = render(
      <DashfooDragProvider>
        <ContextProbe id="external-root" />
        <ExternalSource />
      </DashfooDragProvider>,
    );

    await Promise.resolve();

    const { manager } = captured("external-root");
    const [draggable] = manager.registry.draggables;
    assert(draggable);
    const capturedId = String(draggable.id);

    unmount();

    expect(manager.registry.draggables.has(capturedId)).toBe(false);
  });

  test("warns once when no drag root is above it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <>
        <ExternalSource />
        <ExternalSource />
      </>,
    );

    const calls = warn.mock.calls.filter(([message]) =>
      String(message).includes("useExternalTabSource"),
    );

    expect(calls).toHaveLength(1);
    warn.mockRestore();
  });
});

const DroppableTabset = ({ id }: { id: string }): ReactNode => {
  const { ref } = useTabsetDroppable(id);

  return <div ref={ref} />;
};

const LayerHarness = ({ children }: { children: ReactNode }): ReactNode => (
  <Layout.Root dispatch={() => {}} model={model()} renderers={{ tab: () => null }}>
    <ContextProbe id="harness-root" />
    {children}
  </Layout.Root>
);

describe("useTabsetDroppable", () => {
  test("registers a Droppable carrying the layer and model ids, and removes it on unmount", async () => {
    const { unmount } = render(
      <LayerHarness>
        <Layout.DragLayer>
          <DroppableTabset id="ts1" />
        </Layout.DragLayer>
      </LayerHarness>,
    );

    await Promise.resolve();

    const { manager } = captured("harness-root");
    const [droppable] = [...manager.registry.droppables];
    assert(droppable);
    expect(droppable.data.tabsetId).toBe("ts1");
    expect(droppable.data.layerId).toBeTruthy();
    expect(droppable.element).toBeInstanceOf(HTMLElement);

    unmount();

    expect([...manager.registry.droppables]).toHaveLength(0);
  });

  test("sibling layers reusing a model tabset id keep distinct registrations", async () => {
    render(
      <LayerHarness>
        <Layout.DragLayer>
          <DroppableTabset id="ts1" />
        </Layout.DragLayer>
        <Layout.DragLayer>
          <DroppableTabset id="ts1" />
        </Layout.DragLayer>
      </LayerHarness>,
    );
    await Promise.resolve();

    const registered = [...captured("harness-root").manager.registry.droppables];
    expect(registered).toHaveLength(2);
    expect(new Set(registered.map((droppable) => droppable.id)).size).toBe(2);
  });
});

describe("Feedback overlay wiring", () => {
  test("the root mounts exactly one overlay and hands it to Feedback; layers and floats add none", () => {
    render(<HandBuiltLayout />);

    const wrappers = document.querySelectorAll("[data-dnd-overlay]");
    expect(wrappers).toHaveLength(1);
    const feedback = captured("main-tab").manager.registry.plugins.get(Feedback);
    expect(feedback?.overlay).toBe(wrappers[0]);
  });

  test("the overlay assignment survives a StrictMode double mount", () => {
    render(
      <StrictMode>
        <DashfooDragProvider>
          <ContextProbe id="strict-root" />
        </DashfooDragProvider>
      </StrictMode>,
    );

    const wrappers = document.querySelectorAll("[data-dnd-overlay]");
    expect(wrappers).toHaveLength(1);
    const feedback = captured("strict-root").manager.registry.plugins.get(Feedback);
    expect(feedback?.overlay).toBe(wrappers[0]);
  });
});

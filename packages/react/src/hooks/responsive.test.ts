import type { Dashfoo } from "@dashfoo/core";
import { floatNode, model, row, tab, tabset } from "@dashfoo/core";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { ResponsiveOptions } from "./responsive";
import { useResponsiveLayout } from "./responsive";

const nestedModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("main", "Main")], { id: "main", weight: 3 }),
        row(
          [
            tabset([tab("notes", "Notes")], { id: "notes" }),
            tabset([tab("logs", "Logs")], { id: "logs" }),
          ],
          { id: "side", orientation: "column" },
        ),
      ],
      { id: "root" },
    ),
    {
      floats: [
        floatNode(
          row([tabset([tab("chat", "Chat")], { id: "chat" })], { id: "float-root" }),
          { height: 200, left: 0, top: 0, width: 300 },
          { id: "f1" },
        ),
      ],
    },
  );

const measurement: { width: number | undefined } = { width: undefined };

class MeasuringObserver {
  static instances: Array<MeasuringObserver> = [];
  callback: (entries: Array<{ contentRect: { width: number } }>) => void;
  disconnect = vi.fn<() => void>();
  observe = vi.fn<(target: Element) => void>(() => {
    if (measurement.width !== undefined) {
      this.callback([{ contentRect: { width: measurement.width } }]);
    }
  });

  constructor(callback: (entries: Array<{ contentRect: { width: number } }>) => void) {
    this.callback = callback;
    MeasuringObserver.instances.push(this);
  }
}

const stubContainerWidth = (width: number | undefined): void => {
  measurement.width = width;
  vi.stubGlobal("ResizeObserver", MeasuringObserver);
};

const renderMeasured = (source: Dashfoo, options: ResponsiveOptions | undefined) => {
  const rendered = renderHook(() => useResponsiveLayout(source, options));
  act(() => {
    rendered.result.current.rootRef(document.createElement("div"));
  });
  return rendered;
};

afterEach(() => {
  vi.unstubAllGlobals();
  MeasuringObserver.instances = [];
});

describe("useResponsiveLayout", () => {
  test("passes the model through, unlocked, above the breakpoint", () => {
    stubContainerWidth(1200);
    const source = nestedModel();
    const { result } = renderMeasured(source, { maxWidth: 720 });

    expect(result.current.isCompact).toBe(false);
    expect(result.current.model).toBe(source);
    expect(result.current.restructurable).toBe(true);
    expect(result.current.maximizable).toBe(true);
  });

  test("never compacts without options", () => {
    stubContainerWidth(10);
    const source = nestedModel();
    const { result } = renderMeasured(source, undefined);

    expect(result.current.isCompact).toBe(false);
    expect(result.current.model).toBe(source);
  });

  test("assumes the wide layout before the container is measured", () => {
    const source = nestedModel();
    const { result } = renderHook(() => useResponsiveLayout(source, { maxWidth: 720 }));

    expect(result.current.isCompact).toBe(false);
  });

  test("at or below the breakpoint stacks every row and locks the structure, floats included", () => {
    stubContainerWidth(720);
    const source = { ...nestedModel(), maximizedTabsetId: "main" };
    const { result } = renderMeasured(source, { maxWidth: 720 });
    const { layout } = result.current.model;
    const side = layout.children[1];

    expect(result.current.isCompact).toBe(true);
    expect(result.current.restructurable).toBe(false);
    expect(result.current.maximizable).toBe(false);
    expect(result.current.model.maximizedTabsetId).toBeUndefined();
    expect(layout.orientation).toBe("column");
    expect(layout.children.map((child) => [child.id, child.weight])).toEqual([
      ["main", 1],
      ["side", 2],
    ]);
    expect(side?.type === "row" && side.orientation).toBe("column");
    expect(result.current.model.floats).toBe(source.floats);
  });

  test("keeps row ancestors so nested tabsets are never reparented", () => {
    stubContainerWidth(500);
    const { result } = renderMeasured(nestedModel(), { maxWidth: 720, orientation: "row" });
    const side = result.current.model.layout.children[1];

    expect(result.current.model.layout.orientation).toBe("row");
    expect(side?.type === "row" && side.children.map((child) => child.id)).toEqual([
      "notes",
      "logs",
    ]);
  });

  test("never mutates the canonical model", () => {
    stubContainerWidth(500);
    const source = nestedModel();
    const before = structuredClone(source);
    renderMeasured(source, { maxWidth: 720 });

    expect(source).toEqual(before);
  });
});

describe("container measurement", () => {
  test("disconnects the previous container on replacement, detach and unmount", () => {
    stubContainerWidth(undefined);
    const observers = MeasuringObserver.instances;
    const source = nestedModel();
    const { result, unmount } = renderHook(() => useResponsiveLayout(source, { maxWidth: 720 }));
    const first = document.createElement("div");
    const second = document.createElement("div");

    act(() => {
      result.current.rootRef(first);
    });
    expect(observers[0]?.observe).toHaveBeenCalledWith(first);
    act(() => {
      result.current.rootRef(second);
    });
    expect(observers[0]?.disconnect).toHaveBeenCalledOnce();
    expect(observers[1]?.observe).toHaveBeenCalledWith(second);
    act(() => {
      result.current.rootRef(null);
    });
    expect(observers[1]?.disconnect).toHaveBeenCalledOnce();
    act(() => {
      result.current.rootRef(first);
    });
    unmount();
    expect(observers[2]?.disconnect).toHaveBeenCalledOnce();
  });
});

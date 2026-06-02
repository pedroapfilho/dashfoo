import type { Dashfoo } from "@dashfoo/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { useDashfooStore } from "./store";

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  borders: [],
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "c", id: "t1", name: "T1", type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 60,
      },
      {
        children: [{ component: "c", id: "t2", name: "T2", type: "tab" }],
        id: "ts2",
        selected: 0,
        type: "tabset",
        weight: 40,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

describe("useDashfooStore (uncontrolled)", () => {
  test("exposes the default model", () => {
    const { result } = renderHook(() => useDashfooStore({ defaultModel: model() }));

    expect(result.current.model.activeTabsetId).toBe("ts1");
  });

  test("dispatch updates the model and fires onModelChange", () => {
    const onModelChange = vi.fn();
    const { result } = renderHook(() => useDashfooStore({ defaultModel: model(), onModelChange }));

    act(() => {
      result.current.dispatch({ tabsetId: "ts2", type: "setActiveTabset" });
    });

    expect(result.current.model.activeTabsetId).toBe("ts2");
    expect(onModelChange).toHaveBeenCalledWith(
      expect.objectContaining({ activeTabsetId: "ts2" }),
      expect.objectContaining({ type: "setActiveTabset" }),
    );
  });

  test("undo and redo walk the history", () => {
    const { result } = renderHook(() => useDashfooStore({ defaultModel: model() }));

    act(() => {
      result.current.dispatch({ tabsetId: "ts2", type: "setActiveTabset" });
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.model.activeTabsetId).toBe("ts1");

    act(() => {
      result.current.redo();
    });
    expect(result.current.model.activeTabsetId).toBe("ts2");
  });
});

describe("useDashfooStore (controlled)", () => {
  test("renders the model prop and routes changes through onModelChange", () => {
    const onModelChange = vi.fn();
    const { rerender, result } = renderHook(
      ({ current }) => useDashfooStore({ model: current, onModelChange }),
      { initialProps: { current: model() } },
    );

    expect(result.current.model.activeTabsetId).toBe("ts1");

    act(() => {
      result.current.dispatch({ tabsetId: "ts2", type: "setActiveTabset" });
    });

    // controlled: the prop is unchanged until the host updates it; the next model
    // is offered through onModelChange.
    expect(result.current.model.activeTabsetId).toBe("ts1");
    expect(onModelChange).toHaveBeenCalledWith(
      expect.objectContaining({ activeTabsetId: "ts2" }),
      expect.objectContaining({ type: "setActiveTabset" }),
    );

    const next = model();
    next.activeTabsetId = "ts2";
    rerender({ current: next });

    expect(result.current.model.activeTabsetId).toBe("ts2");
  });
});

import type { Dashfoo } from "@dashfoo/core";
import { toJSON } from "@dashfoo/core";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { memoryStorageAdapter, usePersistence } from "./persistence";

const modelWith = (tabName: string): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "c", id: "t1", name: tabName, type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const firstTabName = (model: Dashfoo | undefined): string | undefined => {
  const tabset = model?.layout.children[0];
  return tabset?.type === "tabset" ? tabset.children[0]?.name : undefined;
};

const config = (storage: ReturnType<typeof memoryStorageAdapter>, debounceMs = 300) => ({
  debounceMs,
  key: "layout",
  storage,
});

describe("memoryStorageAdapter", () => {
  test("round-trips get/set/remove", () => {
    const storage = memoryStorageAdapter();
    expect(storage.getItem("k")).toBeNull();
    storage.setItem("k", "v");
    expect(storage.getItem("k")).toBe("v");
    storage.removeItem("k");
    expect(storage.getItem("k")).toBeNull();
  });
});

describe("usePersistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("loads a saved model when storage has one", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", toJSON(modelWith("Saved")));

    const { result } = renderHook(() => usePersistence(config(storage), modelWith("Default")));

    expect(firstTabName(result.current.initialModel)).toBe("Saved");
  });

  test("falls back to the default model when storage is empty", () => {
    const storage = memoryStorageAdapter();

    const { result } = renderHook(() => usePersistence(config(storage), modelWith("Default")));

    expect(firstTabName(result.current.initialModel)).toBe("Default");
  });

  test("falls back and clears a corrupt stored value", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", "{ not valid json");

    const { result } = renderHook(() => usePersistence(config(storage), modelWith("Default")));

    expect(firstTabName(result.current.initialModel)).toBe("Default");
    expect(storage.getItem("layout")).toBeNull();
  });

  test("debounce-saves the latest model and collapses rapid changes", () => {
    const storage = memoryStorageAdapter();
    const { result } = renderHook(() => usePersistence(config(storage), modelWith("Default")));

    act(() => {
      result.current.save(modelWith("One"));
      result.current.save(modelWith("Two"));
    });
    expect(storage.getItem("layout")).toBeNull(); // not yet (debounced)

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(storage.getItem("layout")).toBe(toJSON(modelWith("Two")));
  });

  test("clear() removes the saved layout", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", toJSON(modelWith("Saved")));
    const { result } = renderHook(() => usePersistence(config(storage), modelWith("Default")));

    act(() => {
      result.current.clear();
    });

    expect(storage.getItem("layout")).toBeNull();
  });

  test("flushes a pending save on unmount", () => {
    const storage = memoryStorageAdapter();
    const { result, unmount } = renderHook(() =>
      usePersistence(config(storage), modelWith("Default")),
    );

    act(() => {
      result.current.save(modelWith("Edited"));
    });
    unmount();

    expect(storage.getItem("layout")).toBe(toJSON(modelWith("Edited")));
  });

  test("a null config makes save and clear no-ops", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", toJSON(modelWith("Saved")));
    const { result } = renderHook(() => usePersistence(null, modelWith("Default")));

    // null config => the default seeds initialModel; storage is never read or written.
    expect(firstTabName(result.current.initialModel)).toBe("Default");
    act(() => {
      result.current.save(modelWith("Edited"));
      vi.advanceTimersByTime(300);
      result.current.clear();
    });
    expect(storage.getItem("layout")).toBe(toJSON(modelWith("Saved")));
  });
});

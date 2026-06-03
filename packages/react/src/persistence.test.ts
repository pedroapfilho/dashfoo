import type { Dashfoo } from "@dashfoo/core";
import { toJSON } from "@dashfoo/core";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { memoryStorageAdapter, usePersistedModel } from "./persistence";

const modelWith = (tabName: string): Dashfoo => ({
  activeTabsetId: "ts1",
  borders: [],
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

const firstTabName = (model: Dashfoo): string | undefined => {
  const tabset = model.layout.children[0];
  return tabset?.type === "tabset" ? tabset.children[0]?.name : undefined;
};

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

describe("usePersistedModel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("loads a saved model when storage has one", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", toJSON(modelWith("Saved")));

    const { result } = renderHook(() =>
      usePersistedModel({ defaultModel: modelWith("Default"), key: "layout", storage }),
    );

    expect(firstTabName(result.current.defaultModel)).toBe("Saved");
  });

  test("falls back to the default model when storage is empty", () => {
    const storage = memoryStorageAdapter();

    const { result } = renderHook(() =>
      usePersistedModel({ defaultModel: modelWith("Default"), key: "layout", storage }),
    );

    expect(firstTabName(result.current.defaultModel)).toBe("Default");
  });

  test("falls back and clears a corrupt stored value", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", "{ not valid json");

    const { result } = renderHook(() =>
      usePersistedModel({ defaultModel: modelWith("Default"), key: "layout", storage }),
    );

    expect(firstTabName(result.current.defaultModel)).toBe("Default");
    expect(storage.getItem("layout")).toBeNull();
  });

  test("debounce-saves the latest model and collapses rapid changes", () => {
    const storage = memoryStorageAdapter();
    const { result } = renderHook(() =>
      usePersistedModel({
        debounceMs: 300,
        defaultModel: modelWith("Default"),
        key: "layout",
        storage,
      }),
    );

    act(() => {
      result.current.onModelChange(modelWith("One"));
      result.current.onModelChange(modelWith("Two"));
    });
    expect(storage.getItem("layout")).toBeNull(); // not yet (debounced)

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const saved = storage.getItem("layout");
    expect(saved).toBe(toJSON(modelWith("Two")));
  });

  test("clear() removes the saved layout and reverts to the default", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", toJSON(modelWith("Saved")));
    const { result } = renderHook(() =>
      usePersistedModel({ defaultModel: modelWith("Default"), key: "layout", storage }),
    );
    const keyBefore = result.current.resetKey;

    act(() => {
      result.current.clear();
    });

    expect(storage.getItem("layout")).toBeNull();
    expect(firstTabName(result.current.defaultModel)).toBe("Default");
    expect(result.current.resetKey).not.toBe(keyBefore);
  });

  test("flushes a pending save on unmount", () => {
    const storage = memoryStorageAdapter();
    const { result, unmount } = renderHook(() =>
      usePersistedModel({ defaultModel: modelWith("Default"), key: "layout", storage }),
    );

    act(() => {
      result.current.onModelChange(modelWith("Edited"));
    });
    unmount();

    expect(storage.getItem("layout")).toBe(toJSON(modelWith("Edited")));
  });
});

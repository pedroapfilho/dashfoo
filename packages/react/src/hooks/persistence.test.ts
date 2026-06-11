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

  test("a corrupt stored value warns and is removed on mount", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", "{ not valid json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const removeItem = vi.spyOn(storage, "removeItem");

    renderHook(() => usePersistence(config(storage), modelWith("Default")));

    expect(warn).toHaveBeenCalledWith(
      "[dashfoo] discarding unreadable persisted layout",
      expect.anything(),
    );
    expect(removeItem).toHaveBeenCalledWith("layout");
    expect(storage.getItem("layout")).toBeNull();

    warn.mockRestore();
    removeItem.mockRestore();
  });

  test("a queued save lands under the key it was produced for after a key change", () => {
    const storage = memoryStorageAdapter();
    const { rerender, result } = renderHook(
      ({ key }: { key: string }) =>
        usePersistence({ debounceMs: 300, key, storage }, modelWith("Default")),
      { initialProps: { key: "old" } },
    );

    act(() => {
      result.current.save(modelWith("Edited"));
    });
    // Change the persist key while the debounced write is still queued.
    rerender({ key: "new" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // The pending write is key-tagged, so it lands under "old", never the new key.
    expect(storage.getItem("old")).toBe(toJSON(modelWith("Edited")));
    expect(storage.getItem("new")).toBeNull();
  });

  test("a queued save lands in the storage it was produced for after a config change", () => {
    const oldStorage = memoryStorageAdapter();
    const newStorage = memoryStorageAdapter();
    const { rerender, result } = renderHook(
      ({ storage }: { storage: ReturnType<typeof memoryStorageAdapter> }) =>
        usePersistence({ debounceMs: 300, key: "layout", storage }, modelWith("Default")),
      { initialProps: { storage: oldStorage } },
    );

    act(() => {
      result.current.save(modelWith("Edited"));
    });
    // Swap the storage backend while the debounced write is still queued.
    rerender({ storage: newStorage });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(oldStorage.getItem("layout")).toBe(toJSON(modelWith("Edited")));
    expect(newStorage.getItem("layout")).toBeNull();
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

  test("flushes a pending save on pagehide", () => {
    const storage = memoryStorageAdapter();
    const { result } = renderHook(() => usePersistence(config(storage), modelWith("Default")));

    act(() => {
      result.current.save(modelWith("Edited"));
    });
    expect(storage.getItem("layout")).toBeNull(); // still debounced

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(storage.getItem("layout")).toBe(toJSON(modelWith("Edited")));
  });

  test("flushes a pending save when the page becomes hidden, not while visible", () => {
    const storage = memoryStorageAdapter();
    const { result } = renderHook(() => usePersistence(config(storage), modelWith("Default")));

    act(() => {
      result.current.save(modelWith("Edited"));
    });
    // jsdom reports "visible" by default; a visible change must not flush.
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(storage.getItem("layout")).toBeNull();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // Drop the own property so the prototype getter is back for other tests.
    Reflect.deleteProperty(document, "visibilityState");

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

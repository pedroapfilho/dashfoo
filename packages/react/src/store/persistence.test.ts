import type { Action, Dashfoo } from "@dashfoo/core";
import { toJSON } from "@dashfoo/core";
import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { PersistInput, StorageAdapter } from "./persistence";
import { memoryStorageAdapter } from "./persistence";
import { useDashfooStore } from "./store";

const fail = (): never => {
  throw new Error("Storage unavailable");
};

const modelWith = (tabName: string): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "c", id: "t1", name: tabName, type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

const firstTabName = (model: Dashfoo | undefined): string | undefined => {
  const tabset = model?.layout.children[0];

  return tabset?.type === "tabset" ? tabset.children[0]?.name : undefined;
};

const rename = (name: string): Action => ({ name, tabId: "t1", type: "renameTab" });

const target = (storage: StorageAdapter): PersistInput => ({ key: "layout", storage });

const renderPersisted = (persist: PersistInput, onModelChange?: (model: Dashfoo) => void) =>
  renderHook(() => useDashfooStore({ defaultModel: modelWith("Default"), onModelChange, persist }));

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

describe("useDashfooStore persist", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders the seed first, then restores storage once, silently", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", toJSON(modelWith("Saved")));
    const read = vi.spyOn(storage, "getItem");
    const write = vi.spyOn(storage, "setItem");
    const onModelChange = vi.fn<(model: Dashfoo) => void>();
    const rendered: Array<string | undefined> = [];

    const { result } = renderHook(
      () => {
        const store = useDashfooStore({
          defaultModel: modelWith("Default"),
          onModelChange,
          persist: target(storage),
        });

        rendered.push(firstTabName(store.model));

        return store;
      },
      { wrapper: StrictMode },
    );

    expect(rendered[0]).toBe("Default");
    expect(firstTabName(result.current.model)).toBe("Saved");
    expect(read).toHaveBeenCalledTimes(1);
    act(() => {
      vi.runAllTimers();
    });
    expect(write).not.toHaveBeenCalled();
    expect(onModelChange).not.toHaveBeenCalled();
    expect(result.current.canUndo()).toBe(false);
  });

  test("keeps the default model when storage is empty", () => {
    const { result } = renderPersisted(target(memoryStorageAdapter()));

    expect(firstTabName(result.current.model)).toBe("Default");
  });

  test("a corrupt stored value warns, is removed, and leaves the default", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", "{ not valid json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderPersisted(target(storage));

    expect(firstTabName(result.current.model)).toBe("Default");
    expect(warn).toHaveBeenCalledWith(
      "[dashfoo] discarding unreadable persisted layout",
      expect.anything(),
    );
    expect(storage.getItem("layout")).toBeNull();
    warn.mockRestore();
  });

  test("debounce-saves the latest edit and a fresh store restores it", () => {
    const storage = memoryStorageAdapter();
    const first = renderPersisted(target(storage));

    act(() => {
      first.result.current.dispatch(rename("One"));
      first.result.current.dispatch(rename("Two"));
    });
    expect(storage.getItem("layout")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(firstTabName(JSON.parse(storage.getItem("layout") ?? "null"))).toBe("Two");
    first.unmount();

    const second = renderPersisted(target(storage));
    expect(firstTabName(second.result.current.model)).toBe("Two");
  });

  test("a bare string persists to localStorage with the default debounce", () => {
    const { result } = renderPersisted("dashfoo:test");

    act(() => {
      result.current.dispatch(rename("Local"));
      vi.advanceTimersByTime(300);
    });

    expect(firstTabName(JSON.parse(localStorage.getItem("dashfoo:test") ?? "null"))).toBe("Local");
    localStorage.removeItem("dashfoo:test");
  });

  test("undo and setModel are saved like any other change", () => {
    const storage = memoryStorageAdapter();
    const { result } = renderPersisted(target(storage));

    act(() => {
      result.current.dispatch(rename("Edited"));
      result.current.undo();
      vi.advanceTimersByTime(300);
    });
    expect(firstTabName(JSON.parse(storage.getItem("layout") ?? "null"))).toBe("Default");

    act(() => {
      result.current.setModel(modelWith("Replaced"));
      vi.advanceTimersByTime(300);
    });
    expect(firstTabName(JSON.parse(storage.getItem("layout") ?? "null"))).toBe("Replaced");
  });

  test("reset clears storage, drops the pending save, and restores the default", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", toJSON(modelWith("Saved")));
    const { result } = renderPersisted(target(storage));

    act(() => {
      result.current.dispatch(rename("Pending"));
      result.current.reset();
      vi.runAllTimers();
    });

    expect(storage.getItem("layout")).toBeNull();
    expect(firstTabName(result.current.model)).toBe("Default");
    expect(result.current.canUndo()).toBe(false);
  });

  test("a queued save lands in the target it was produced for after a change", () => {
    const oldStorage = memoryStorageAdapter();
    const newStorage = memoryStorageAdapter();

    const { rerender, result } = renderHook(
      ({ persist }: { persist: { key: string; storage: StorageAdapter } }) =>
        useDashfooStore({ defaultModel: modelWith("Default"), persist }),
      { initialProps: { persist: { key: "old", storage: oldStorage } } },
    );

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    act(() => {
      result.current.dispatch(rename("Edited"));
    });
    rerender({ persist: { key: "new", storage: newStorage } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(firstTabName(JSON.parse(oldStorage.getItem("old") ?? "null"))).toBe("Edited");
    expect(newStorage.getItem("new")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("persist key changed"));
    warn.mockRestore();
  });

  test("flushes a pending save on unmount", () => {
    const storage = memoryStorageAdapter();
    const { result, unmount } = renderPersisted(target(storage));

    act(() => {
      result.current.dispatch(rename("Edited"));
    });
    unmount();

    expect(firstTabName(JSON.parse(storage.getItem("layout") ?? "null"))).toBe("Edited");
  });

  test("flushes a pending save on pagehide", () => {
    const storage = memoryStorageAdapter();
    const { result } = renderPersisted(target(storage));

    act(() => {
      result.current.dispatch(rename("Edited"));
    });
    expect(storage.getItem("layout")).toBeNull();
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(firstTabName(JSON.parse(storage.getItem("layout") ?? "null"))).toBe("Edited");
  });

  test("flushes a pending save when the page becomes hidden, not while visible", () => {
    const storage = memoryStorageAdapter();
    const { result } = renderPersisted(target(storage));

    act(() => {
      result.current.dispatch(rename("Edited"));
    });
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
    Reflect.deleteProperty(document, "visibilityState");

    expect(firstTabName(JSON.parse(storage.getItem("layout") ?? "null"))).toBe("Edited");
  });

  test("a controlled store ignores persist and warns", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("layout", toJSON(modelWith("Saved")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useDashfooStore({ model: modelWith("Controlled"), persist: target(storage) }),
    );

    act(() => {
      result.current.dispatch(rename("Edited"));
      vi.runAllTimers();
    });

    expect(firstTabName(result.current.model)).toBe("Controlled");
    expect(storage.getItem("layout")).toBe(toJSON(modelWith("Saved")));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`persist` is ignored"));
    warn.mockRestore();
  });

  test("storage read, write and remove failures warn without breaking the store", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderPersisted(target({ getItem: fail, removeItem: fail, setItem: fail }));

    expect(firstTabName(result.current.model)).toBe("Default");
    act(() => {
      result.current.dispatch(rename("Edited"));
      vi.advanceTimersByTime(300);
      result.current.reset();
    });

    expect(firstTabName(result.current.model)).toBe("Default");
    expect(warn).toHaveBeenCalledWith(
      "[dashfoo] failed to load persisted layout",
      expect.any(Error),
    );
    expect(warn).toHaveBeenCalledWith("[dashfoo] failed to persist layout", expect.any(Error));
    expect(warn).toHaveBeenCalledWith(
      "[dashfoo] failed to clear persisted layout",
      expect.any(Error),
    );
    warn.mockRestore();
  });
});

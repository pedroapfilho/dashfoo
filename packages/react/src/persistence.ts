"use client";

import type { Dashfoo } from "@dashfoo/core";
import { fromJSON, toJSON } from "@dashfoo/core";
import { useCallback, useEffect, useRef, useState } from "react";

// A minimal localStorage-shaped backend so layouts can persist to anything: the
// browser, sessionStorage, an in-memory map, or a custom store.
type StorageAdapter = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

const memoryStorageAdapter = (): StorageAdapter => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
};

// SSR-safe browser adapter: reads return null and writes are swallowed (with a
// warning) when storage is unavailable or throws (no window, private mode, quota).
const localStorageAdapter: StorageAdapter = {
  getItem: (key) => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  removeItem: (key) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      // storage unavailable — nothing to remove.
    }
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // A persistence failure (quota, private mode) must not be silent.
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] failed to persist layout", error);
    }
  },
};

// A resolved persistence target: where to save and how often. DashfooLayout's
// `persist` prop and usePersistedModel both normalize their input to this.
type PersistConfig = {
  debounceMs: number;
  key: string;
  storage: StorageAdapter;
};

type Persistence = {
  clear: () => void;
  // undefined only in controlled mode, where no defaultModel seeds the load.
  initialModel: Dashfoo | undefined;
  save: (model: Dashfoo) => void;
};

// The load/save half of persistence, shared by usePersistedModel and the
// DashfooLayout `persist` prop. Loads the saved model once (validated + migrated
// via serialize.ts, falling back to `defaultModel` on miss or corruption) and
// debounce-saves every change. Resetting the live model is the caller's job —
// this primitive only owns the storage side. A null config makes it a no-op, so
// callers can run the hook unconditionally.
const usePersistence = (
  config: PersistConfig | null,
  defaultModel: Dashfoo | undefined,
): Persistence => {
  // Refs keep the callbacks stable while always seeing the latest config; synced
  // in an effect (never written during render).
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  // Load the saved model once. The initializer stays pure (no writes during
  // render); a corrupt stored value is pruned in the mount effect below.
  const [initialModel] = useState<Dashfoo | undefined>(() => {
    if (config === null || defaultModel === undefined) {
      return defaultModel;
    }
    const raw = config.storage.getItem(config.key);
    if (raw === null) {
      return defaultModel;
    }
    try {
      return fromJSON(raw);
    } catch {
      return defaultModel;
    }
  });

  useEffect(() => {
    const current = configRef.current;
    if (current === null) {
      return;
    }
    const raw = current.storage.getItem(current.key);
    if (raw === null) {
      return;
    }
    try {
      fromJSON(raw);
    } catch {
      current.storage.removeItem(current.key);
    }
  }, []);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The pending write carries the key it was produced for, so a key change while
  // a save is queued cannot write the old value under the new key.
  const pending = useRef<{ key: string; value: string } | null>(null);

  const flush = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const current = configRef.current;
    if (pending.current !== null && current !== null) {
      current.storage.setItem(pending.current.key, pending.current.value);
      pending.current = null;
    }
  }, []);

  const save = useCallback(
    (next: Dashfoo): void => {
      const current = configRef.current;
      if (current === null) {
        return;
      }
      pending.current = { key: current.key, value: toJSON(next) };
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(flush, current.debounceMs);
    },
    [flush],
  );

  // Flush a pending save on unmount so the last change is never lost.
  useEffect(
    () => () => {
      flush();
    },
    [flush],
  );

  const clear = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    pending.current = null;
    const current = configRef.current;
    if (current !== null) {
      current.storage.removeItem(current.key);
    }
  }, []);

  return { clear, initialModel, save };
};

type UsePersistedModelOptions = {
  debounceMs?: number;
  defaultModel: Dashfoo;
  key: string;
  storage?: StorageAdapter;
};

type PersistedModel = {
  clear: () => void;
  defaultModel: Dashfoo;
  onModelChange: (model: Dashfoo) => void;
  resetKey: number;
};

// Persist a dashfoo layout for the uncontrolled remount pattern: loads the saved
// model, debounce-saves changes, and remounts on `resetKey` so `clear()` visibly
// resets. Prefer the `persist` prop on DashfooLayout, which wires this in for you:
//
//   const persisted = usePersistedModel({ defaultModel, key: "demo" });
//   <DashfooLayout key={persisted.resetKey} defaultModel={persisted.defaultModel}
//     onModelChange={persisted.onModelChange} ... />
const usePersistedModel = (options: UsePersistedModelOptions): PersistedModel => {
  const { debounceMs = 300, defaultModel, key, storage = localStorageAdapter } = options;
  const {
    clear: clearStorage,
    initialModel,
    save,
  } = usePersistence({ debounceMs, key, storage }, defaultModel);

  const defaultRef = useRef(defaultModel);
  useEffect(() => {
    defaultRef.current = defaultModel;
  });

  const [model, setModel] = useState<Dashfoo>(initialModel ?? defaultModel);
  const [resetKey, setResetKey] = useState(0);

  const clear = useCallback((): void => {
    clearStorage();
    setModel(defaultRef.current);
    setResetKey((value) => value + 1);
  }, [clearStorage]);

  return { clear, defaultModel: model, onModelChange: save, resetKey };
};

export { localStorageAdapter, memoryStorageAdapter, usePersistedModel, usePersistence };
export type {
  Persistence,
  PersistConfig,
  PersistedModel,
  StorageAdapter,
  UsePersistedModelOptions,
};

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

// Persist a dashfoo layout. Loads the saved model once (validated + migrated via
// serialize.ts, falling back to `defaultModel` on miss or corruption), and
// debounce-saves every change. Use it uncontrolled, remounting on `resetKey` so
// `clear()` visibly resets:
//
//   const persisted = usePersistedModel({ defaultModel, key: "demo" });
//   <DashfooLayout key={persisted.resetKey} defaultModel={persisted.defaultModel}
//     onModelChange={persisted.onModelChange} ... />
const usePersistedModel = (options: UsePersistedModelOptions): PersistedModel => {
  const { debounceMs = 300, defaultModel, key, storage = localStorageAdapter } = options;

  // Refs keep the callbacks stable while always seeing the latest props; they are
  // synced in an effect (never written during render).
  const storageRef = useRef(storage);
  const keyRef = useRef(key);
  const defaultRef = useRef(defaultModel);
  useEffect(() => {
    storageRef.current = storage;
    keyRef.current = key;
    defaultRef.current = defaultModel;
  });

  // Load the saved model once, from the first-render props.
  const [model, setModel] = useState<Dashfoo>(() => {
    const raw = storage.getItem(key);
    if (raw === null) {
      return defaultModel;
    }
    try {
      return fromJSON(raw);
    } catch {
      storage.removeItem(key);
      return defaultModel;
    }
  });
  const [resetKey, setResetKey] = useState(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);

  const flush = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current !== null) {
      storageRef.current.setItem(keyRef.current, pending.current);
      pending.current = null;
    }
  }, []);

  const onModelChange = useCallback(
    (next: Dashfoo): void => {
      pending.current = toJSON(next);
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(flush, debounceMs);
    },
    [debounceMs, flush],
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
    storageRef.current.removeItem(keyRef.current);
    setModel(defaultRef.current);
    setResetKey((value) => value + 1);
  }, []);

  return { clear, defaultModel: model, onModelChange, resetKey };
};

export { localStorageAdapter, memoryStorageAdapter, usePersistedModel };
export type { PersistedModel, StorageAdapter, UsePersistedModelOptions };

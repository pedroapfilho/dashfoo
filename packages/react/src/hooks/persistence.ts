"use client";

import type { Dashfoo } from "@dashfoo/core";
import { fromJSON, toJSON } from "@dashfoo/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
      void 0;
    }
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] failed to persist layout", error);
    }
  },
};

type PersistConfig = {
  debounceMs: number;
  key: string;
  storage: StorageAdapter;
};

type Persistence = {
  clear: () => void;

  initialModel: Dashfoo | undefined;
  save: (model: Dashfoo) => void;
};

type StoredLoad =
  | { error: unknown; kind: "corrupt" }
  | { kind: "absent" }
  | { kind: "loaded"; model: Dashfoo };

const usePersistence = (
  config: PersistConfig | null,
  defaultModel: Dashfoo | undefined,
): Persistence => {
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  /**
   * Read and parsed exactly once. The stored value used to be fetched twice on
   * mount, and the two readers disagreed about an unparseable one: the
   * initializer fell back silently, the effect warned and deleted it.
   */
  const [load] = useState<StoredLoad>(() => {
    if (config === null) {
      return { kind: "absent" };
    }
    const raw = config.storage.getItem(config.key);
    if (raw === null) {
      return { kind: "absent" };
    }
    try {
      return { kind: "loaded", model: fromJSON(raw) };
    } catch (error) {
      return { error, kind: "corrupt" };
    }
  });

  const initialModel =
    load.kind === "loaded" && defaultModel !== undefined ? load.model : defaultModel;

  useEffect(() => {
    const current = configRef.current;
    if (current === null || load.kind !== "corrupt") {
      return;
    }
    // oxlint-disable-next-line no-console
    console.warn("[dashfoo] discarding unreadable persisted layout", load.error);
    current.storage.removeItem(current.key);
  }, [load]);

  const loadedKey = useRef(config?.key);
  useEffect(() => {
    if (config !== null && config.key !== loadedKey.current) {
      // oxlint-disable-next-line no-console
      console.warn(
        "[dashfoo] persist key changed for a mounted layout; the displayed layout still reflects the previous key; remount (key={persistKey}) to load the new key",
      );
      loadedKey.current = config.key;
    }
  }, [config]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pending = useRef<{ key: string; storage: StorageAdapter; value: string } | null>(null);

  const flush = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current !== null) {
      pending.current.storage.setItem(pending.current.key, pending.current.value);
      pending.current = null;
    }
  }, []);

  const save = useCallback(
    (next: Dashfoo): void => {
      const current = configRef.current;
      if (current === null) {
        return;
      }
      pending.current = { key: current.key, storage: current.storage, value: toJSON(next) };
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(flush, current.debounceMs);
    },
    [flush],
  );

  useEffect(() => {
    const handlePageHide = (): void => {
      flush();
    };
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flush();
    };
  }, [flush]);

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

  return useMemo(() => ({ clear, initialModel, save }), [clear, initialModel, save]);
};

export { localStorageAdapter, memoryStorageAdapter, usePersistence };
export type { Persistence, PersistConfig, StorageAdapter };

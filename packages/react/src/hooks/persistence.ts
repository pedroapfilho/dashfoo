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
    } catch (error) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] failed to load persisted layout", error);
      return null;
    }
  },
  removeItem: (key) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] failed to clear persisted layout", error);
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

const removeStoredLayout = ({ key, storage }: PersistConfig): void => {
  try {
    storage.removeItem(key);
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn("[dashfoo] failed to clear persisted layout", error);
  }
};

type Persistence = {
  clear: () => void;

  initialModel: Dashfoo | undefined;
  save: (model: Dashfoo) => void;
};

const usePersistence = (
  config: PersistConfig | null,
  defaultModel: Dashfoo | undefined,
): Persistence => {
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [initialModel, setInitialModel] = useState(defaultModel);
  const loaded = useRef(false);
  useEffect(() => {
    // A browser-only read during render disagrees with SSR. Load once after
    // hydration; the layout applies this snapshot without recording an action.
    if (loaded.current) {
      return;
    }
    loaded.current = true;
    const current = configRef.current;
    if (current === null || defaultModel === undefined) {
      return;
    }
    try {
      const raw = current.storage.getItem(current.key);
      if (raw === null) {
        return;
      }
      try {
        const restored = fromJSON(raw);
        setInitialModel(restored);
      } catch (error) {
        // oxlint-disable-next-line no-console
        console.warn("[dashfoo] discarding unreadable persisted layout", error);
        removeStoredLayout(current);
      }
    } catch (error) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] failed to load persisted layout", error);
    }
  }, [defaultModel]);

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
      const write = pending.current;
      pending.current = null;
      try {
        write.storage.setItem(write.key, write.value);
      } catch (error) {
        // oxlint-disable-next-line no-console
        console.warn("[dashfoo] failed to persist layout", error);
      }
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
      removeStoredLayout(current);
    }
  }, []);

  return useMemo(() => ({ clear, initialModel, save }), [clear, initialModel, save]);
};

export { localStorageAdapter, memoryStorageAdapter, usePersistence };
export type { Persistence, PersistConfig, StorageAdapter };

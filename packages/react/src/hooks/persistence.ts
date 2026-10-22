"use client";

import type { Dashfoo } from "@dashfoo/core";
import { fromJSON, toJSON, warn } from "@dashfoo/core";
import { useCallback, useEffect, useMemo, useRef } from "react";

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
      warn("failed to load persisted layout", error);

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
      warn("failed to clear persisted layout", error);
    }
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      warn("failed to persist layout", error);
    }
  },
};

const DEFAULT_DEBOUNCE_MS = 300;

/** A bare string is a localStorage key. */
type PersistInput = string | { debounceMs?: number; key: string; storage?: StorageAdapter };

type PersistTarget = {
  debounceMs: number;
  key: string;
  storage: StorageAdapter;
};

const resolvePersist = (persist: PersistInput | undefined): PersistTarget | null => {
  if (persist === undefined) {
    return null;
  }

  if (typeof persist === "string") {
    return { debounceMs: DEFAULT_DEBOUNCE_MS, key: persist, storage: localStorageAdapter };
  }

  return {
    debounceMs: persist.debounceMs ?? DEFAULT_DEBOUNCE_MS,
    key: persist.key,
    storage: persist.storage ?? localStorageAdapter,
  };
};

const removeStoredLayout = ({ key, storage }: PersistTarget): void => {
  try {
    storage.removeItem(key);
  } catch (error) {
    warn("failed to clear persisted layout", error);
  }
};

const loadStoredLayout = (target: PersistTarget): Dashfoo | undefined => {
  try {
    const raw = target.storage.getItem(target.key);

    if (raw === null) {
      return undefined;
    }

    try {
      return fromJSON(raw);
    } catch (error) {
      warn("discarding unreadable persisted layout", error);
      removeStoredLayout(target);

      return undefined;
    }
  } catch (error) {
    warn("failed to load persisted layout", error);

    return undefined;
  }
};

type LayoutStorage = {
  clear: () => void;
  save: (model: Dashfoo) => void;
};

/**
 * `restore` receives the stored layout once, after mount: a browser-only read
 * during render would disagree with the server render.
 */
const useLayoutStorage = (
  persist: PersistInput | undefined,
  restore: (model: Dashfoo) => void,
): LayoutStorage => {
  const target = resolvePersist(persist);
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) {
      return;
    }

    loaded.current = true;
    const current = targetRef.current;
    const restored = current === null ? undefined : loadStoredLayout(current);

    if (restored !== undefined) {
      // oxlint-disable-next-line react-doctor/no-pass-data-to-parent -- restoration must happen after hydration, without an action or undo entry
      restore(restored);
    }
  }, [restore]);

  const key = target?.key;
  const loadedKey = useRef(key);
  useEffect(() => {
    if (key !== undefined && key !== loadedKey.current) {
      warn(
        "persist key changed for a mounted layout; the displayed layout still reflects the previous key; remount (key={persistKey}) to load the new key",
      );
      loadedKey.current = key;
    }
  }, [key]);

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
        warn("failed to persist layout", error);
      }
    }
  }, []);

  const save = useCallback(
    (next: Dashfoo): void => {
      const current = targetRef.current;

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
    const current = targetRef.current;

    if (current !== null) {
      removeStoredLayout(current);
    }
  }, []);

  return useMemo(() => ({ clear, save }), [clear, save]);
};

export { localStorageAdapter, memoryStorageAdapter, useLayoutStorage };

export type { PersistInput, StorageAdapter };

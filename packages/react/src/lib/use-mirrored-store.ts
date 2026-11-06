"use client";

import { useLayoutEffect, useState } from "react";
import type { StoreApi } from "zustand";

/**
 * A store created once from the first snapshot and re-synced with every
 * render's snapshot, so subscribers re-render only for the slices they select.
 * The sync is a layout effect so children read the new values before paint.
 */
const useMirroredStore = <State, Snapshot extends Partial<State>>(
  create: (initial: Snapshot) => StoreApi<State>,
  snapshot: Snapshot,
): StoreApi<State> => {
  const [store] = useState(() => create(snapshot));

  useLayoutEffect(() => {
    store.setState(snapshot);
  });

  return store;
};

export { useMirroredStore };

"use client";

import type { Geometry } from "@dashfoo/core";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { createStore, useStore } from "zustand";

// Live browser-window proxies for detached panels, keyed by the model window id.
// A scoped zustand store (not context state) so registering/closing a popup
// re-renders only the windows host, never the whole layout. The model owns the
// window structure; this store owns the ephemeral WindowProxy that structure
// renders into.
type PopoutWindowsState = { windows: Record<string, Window> };

type PopoutStore = StoreApi<PopoutWindowsState>;

const createPopoutStore = (): PopoutStore =>
  createStore<PopoutWindowsState>(() => ({ windows: {} }));

type PopoutContextValue = {
  // Open a browser window NOW — call it synchronously inside a click gesture so
  // the popup blocker allows it — and register the proxy under windowId. The
  // model node created right after pins to the same id. Also creates the popup's
  // own React root (a separate root, not a portal, so event delegation lands
  // inside the popup's document — a cross-document portal leaves clicks dead).
  // Returns whether the window opened: dispatch the detach only when it did, so a
  // blocked popup leaves the panel docked.
  open: (windowId: string, geometry: Geometry) => boolean;
  // Close and unregister the popup behind a window id (docked back or gone).
  release: (windowId: string) => void;
  // (Re)render an element into the popup's React root. No-op for an unknown id.
  render: (windowId: string, element: ReactNode) => void;
  store: PopoutStore;
};

const PopoutContext = createContext<PopoutContextValue | null>(null);

const usePopout = (): PopoutContextValue | null => useContext(PopoutContext);

const usePopoutWindows = (store: PopoutStore): Record<string, Window> =>
  useStore(store, (state) => state.windows);

export { createPopoutStore, PopoutContext, usePopout, usePopoutWindows };
export type { PopoutContextValue, PopoutStore, PopoutWindowsState };

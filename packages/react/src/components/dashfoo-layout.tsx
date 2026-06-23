"use client";

import type {
  Action,
  Dashfoo,
  DockLocation,
  Orientation,
  SnapConfig,
  TabNode,
  TabsetNode,
} from "@dashfoo/core";
import { findTabset, stackModel } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";
import { forwardRef, useCallback, useContext, useImperativeHandle, useMemo, useRef } from "react";

import { SharedDragManagerContext } from "../hooks/drag-hooks";
import type { PersistConfig, StorageAdapter } from "../hooks/persistence";
import { localStorageAdapter, usePersistence } from "../hooks/persistence";
import { useContainerWidth } from "../hooks/responsive";
import { useDashfooStore } from "../hooks/store";

import { DashfooDragProvider } from "./drag-root";
import { Layout } from "./layout";

const DEFAULT_PERSIST_DEBOUNCE_MS = 300;

// `persist` accepts a bare localStorage key or a full target (custom storage,
// debounce). Controlled mode (a `model` prop, no `defaultModel`) skips it —
// persistence implies the library owns the state.
type PersistInput = string | { debounceMs?: number; key: string; storage?: StorageAdapter };

const resolvePersist = (
  persist: PersistInput | undefined,
  hasDefaultModel: boolean,
): PersistConfig | null => {
  if (persist === undefined || !hasDefaultModel) {
    return null;
  }
  if (typeof persist === "string") {
    return { debounceMs: DEFAULT_PERSIST_DEBOUNCE_MS, key: persist, storage: localStorageAdapter };
  }
  return {
    debounceMs: persist.debounceMs ?? DEFAULT_PERSIST_DEBOUNCE_MS,
    key: persist.key,
    storage: persist.storage ?? localStorageAdapter,
  };
};

type TabComponent = ComponentType<{ node: TabNode }>;

// Component names already warned about, so the dev warning fires at most once each.
const warnedComponents = new Set<string>();

// Imperative API exposed via ref — lets a host drive the layout from a toolbar,
// command palette, or keyboard shortcuts without rebuilding the store's plumbing.
type DashfooHandle = {
  addTab: (
    tab: TabNode,
    target: { index?: number; location?: DockLocation; targetId: string },
  ) => void;
  canRedo: () => boolean;
  canUndo: () => boolean;
  closeTab: (tabId: string) => void;
  dispatch: (action: Action) => void;
  // Dock a floating panel back into the main layout.
  dockFloat: (floatId: string) => void;
  // Float a tab out into a movable, resizable panel.
  floatTab: (tabId: string) => void;
  getModel: () => Dashfoo;
  maximizeTabset: (tabsetId: string | null) => void;
  redo: () => void;
  renameTab: (tabId: string, name: string) => void;
  // Reset to the original defaultModel, clearing undo history and any persisted
  // copy. No-op in controlled mode (the host owns the model).
  resetLayout: () => void;
  selectTab: (tabsetId: string, index: number) => void;
  undo: () => void;
};

type DashfooLayoutProps = {
  closableTabs?: boolean;
  components?: Record<string, TabComponent>;
  defaultModel?: Dashfoo;
  draggableTabs?: boolean;
  draggableTabsets?: boolean;
  // false renders a static dashboard: no drag, close, rename, or resize. Tab
  // selection, maximize, and the imperative ref API keep working.
  editable?: boolean;
  factory?: (tab: TabNode) => ReactNode;
  // Show a per-tabset control that floats the panel into a movable, resizable
  // overlay (and render any floating panels). Off by default — opt in. Floating
  // adds the panel to the model's `floats`.
  floatable?: boolean;
  keepMounted?: boolean;
  maximizable?: boolean;
  model?: Dashfoo;
  onAction?: (action: Action) => Action | null;
  onActiveTabsetChange?: (tabsetId: string | undefined) => void;
  onMaximizedTabsetChange?: (tabsetId: string | undefined) => void;
  onModelChange?: (model: Dashfoo, action?: Action) => void;
  persist?: PersistInput;
  renamableTabs?: boolean;
  renderTabLabel?: (tab: TabNode) => ReactNode;
  renderTabsetToolbar?: (tabset: TabsetNode) => ReactNode;
  // At or below `maxWidth` (the layout's own container width, not the viewport)
  // the layout renders one stacked column and locks drag and resize. The stack is
  // a view-only projection, so widening back is lossless and never remounts.
  // `orientation` defaults to "column".
  resizableSplits?: boolean;
  responsive?: { maxWidth: number; orientation?: Orientation };
  // Magnetic snap for split resize: the dragged boundary pulls to multiples of
  // `step` (percent of the group) within `threshold`. A row may override this via
  // its own `snap` attribute. Off when omitted; locked off in compact mode.
  snap?: SnapConfig;
};

// The batteries-included component: owns the store (controlled or uncontrolled),
// resolves tab content via a components registry or a factory, and assembles the
// same Layout/Tabset primitives a hand-built layout would use.
// forwardRef (not the React 19 ref-as-prop) keeps the React 18 peer working.
const DashfooLayout = forwardRef<DashfooHandle, DashfooLayoutProps>((props, ref): ReactNode => {
  const {
    closableTabs = true,
    components,
    defaultModel,
    draggableTabs = true,
    draggableTabsets = true,
    editable = true,
    factory,
    floatable = false,
    keepMounted = false,
    maximizable = true,
    model,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange,
    persist,
    renamableTabs = true,
    renderTabLabel,
    renderTabsetToolbar,
    resizableSplits = true,
    responsive,
    snap,
  } = props;

  const persistConfig = useMemo(
    () => resolvePersist(persist, defaultModel !== undefined),
    [persist, defaultModel],
  );
  const persistence = usePersistence(persistConfig, defaultModel);

  // The save side of persistence rides onModelChange; the consumer's own handler
  // still fires after it.
  const handleModelChange = useCallback(
    (next: Dashfoo, action?: Action): void => {
      persistence.save(next);
      onModelChange?.(next, action);
    },
    [onModelChange, persistence],
  );

  const store = useDashfooStore({
    defaultModel: persistence.initialModel ?? defaultModel,
    model,
    onAction,
    onActiveTabsetChange,
    onMaximizedTabsetChange,
    onModelChange: handleModelChange,
  });

  // A host can wrap the layout in DashfooDragProvider to share a manager with
  // external sources; if so, reuse it (the floats join that shared manager too).
  const hasSharedManager = useContext(SharedDragManagerContext) !== null;

  useImperativeHandle(
    ref,
    () => ({
      addTab: (tab, target) =>
        store.dispatch({
          index: target.index,
          location: target.location ?? "center",
          tab,
          targetId: target.targetId,
          type: "addNode",
        }),
      canRedo: store.canRedo,
      canUndo: store.canUndo,
      closeTab: (tabId) => store.dispatch({ tabId, type: "deleteTab" }),
      dispatch: store.dispatch,
      dockFloat: (floatId) => store.dispatch({ floatId, type: "dockFloat" }),
      floatTab: (tabId) => store.dispatch({ tabId, type: "floatTab" }),
      getModel: () => store.model,
      maximizeTabset: (tabsetId) => store.dispatch({ tabsetId, type: "setMaximizedTabset" }),
      redo: store.redo,
      renameTab: (tabId, name) => store.dispatch({ name, tabId, type: "renameTab" }),
      resetLayout: () => {
        persistence.clear();
        if (defaultModel !== undefined) {
          store.setModel(defaultModel);
        }
      },
      selectTab: (tabsetId, index) => store.dispatch({ index, tabsetId, type: "selectTab" }),
      undo: store.undo,
    }),
    [defaultModel, persistence, store],
  );

  const renderTab = useCallback(
    (tab: TabNode): ReactNode => {
      if (factory) {
        return factory(tab);
      }
      const Component = components?.[tab.component];
      if (!Component) {
        if (components && !warnedComponents.has(tab.component)) {
          warnedComponents.add(tab.component);
          // A tab whose component is not registered renders nothing — surface it
          // once so the misconfiguration is not silent.
          // oxlint-disable-next-line no-console
          console.warn(`[dashfoo] no component registered for "${tab.component}"`);
        }
        return null;
      }
      return <Component node={tab} />;
    },
    [components, factory],
  );

  // While compact, render a stacked projection; the canonical store.model is
  // untouched (ids survive stackModel, so tap-to-select still routes), so widening
  // back is lossless.
  const [containerRef, width] = useContainerWidth();
  const isCompact = responsive !== undefined && width <= responsive.maxWidth;
  const view = useMemo(
    () => (isCompact ? stackModel(store.model, responsive?.orientation) : store.model),
    [isCompact, responsive?.orientation, store.model],
  );

  // rrp auto-fires onLayoutChanged as it re-measures the stacked structure, which
  // would commit an adjustSplit and corrupt the canonical model. The lock flags
  // can't gate it — they reach the resize adapter via the layout store one commit
  // late, so resizableSplits is stale-true during the swap. Gate at the dispatch
  // boundary instead: a stable dispatch reads isCompact from a ref written during
  // render (current before rrp's onLayoutChanged, which can fire in a child effect
  // ahead of this component's effects).
  const isCompactRef = useRef(isCompact);
  isCompactRef.current = isCompact;
  const dispatch = useCallback(
    (action: Action): void => {
      if (isCompactRef.current && action.type === "adjustSplit") {
        return;
      }
      store.dispatch(action);
    },
    [store],
  );

  // A maximized tabset fills the frame on its own; otherwise the row tree renders.
  const maximized = view.maximizedTabsetId ? findTabset(view, view.maximizedTabsetId) : undefined;

  // Floating panels overlay the layout and render from the canonical model rather
  // than the (possibly stacked) compact view.
  const tree = (
    <Layout.FloatLayer floats={store.model.floats ?? []} global={store.model.global}>
      <Layout.DragLayer>
        {maximized ? <Layout.Tabset node={maximized} /> : <Layout.Rows node={view.layout} />}
      </Layout.DragLayer>
    </Layout.FloatLayer>
  );

  return (
    <Layout.Root
      closableTabs={closableTabs}
      dispatch={dispatch}
      draggableTabs={isCompact ? false : draggableTabs}
      draggableTabsets={isCompact ? false : draggableTabsets}
      editable={editable}
      floatable={isCompact ? false : floatable}
      keepMounted={keepMounted}
      maximizable={maximizable}
      model={view}
      renamableTabs={renamableTabs}
      renderTab={renderTab}
      renderTabLabel={renderTabLabel}
      renderTabsetToolbar={renderTabsetToolbar}
      resizableSplits={isCompact ? false : resizableSplits}
      rootRef={containerRef}
      snap={snap}
    >
      {/* Share one drag manager across the main layout and every float, so a tab
          can be dragged between them — unless a host DashfooDragProvider already
          provides one (which also lets external sources participate). */}
      {hasSharedManager ? tree : <DashfooDragProvider>{tree}</DashfooDragProvider>}
    </Layout.Root>
  );
});

DashfooLayout.displayName = "DashfooLayout";

export { DashfooLayout };
export type { DashfooHandle, DashfooLayoutProps, TabComponent };

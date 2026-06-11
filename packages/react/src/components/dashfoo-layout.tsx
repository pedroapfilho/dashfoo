"use client";

import type { Action, Dashfoo, DockLocation, TabNode, TabsetNode } from "@dashfoo/core";
import { findTabset } from "@dashfoo/core";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";

import { DashfooContext } from "../hooks/context";
import type { PersistConfig, StorageAdapter } from "../hooks/persistence";
import { localStorageAdapter, usePersistence } from "../hooks/persistence";
import { useDashfooStore } from "../hooks/store";

import { DragProvider } from "./drag-adapter";
import { RowView } from "./row-view";
import { TabsetView } from "./tabset-view";

const DEFAULT_PERSIST_DEBOUNCE_MS = 300;
const DEFAULT_TABSET_MIN_SIZE = 320;

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
  draggableTabsets?: boolean;
  factory?: (tab: TabNode) => ReactNode;
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
};

const rootStyle = { display: "flex", height: "100%", width: "100%" } as const;

// The top-level component. Owns the store (controlled or uncontrolled), resolves
// tab content via a components registry or a factory, and renders the layout tree.
// forwardRef (not the React 19 ref-as-prop) keeps the React 18 peer working.
const DashfooLayout = forwardRef<DashfooHandle, DashfooLayoutProps>((props, ref): ReactNode => {
  const {
    closableTabs = true,
    components,
    defaultModel,
    draggableTabsets = true,
    factory,
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

  // Model-level globals act as a default layer under the component props: a
  // feature is on unless the prop, the global, or the per-node flag turns it off.
  const global = store.model.global;
  const effectiveClosable = closableTabs && global.tabEnableClose !== false;
  const effectiveRenamable = renamableTabs && global.tabEnableRename !== false;
  const effectiveMaximizable = maximizable && global.tabSetEnableMaximize !== false;
  const tabLocation = global.tabLocation ?? "top";
  const tabsetMinSize = global.tabSetMinSize ?? DEFAULT_TABSET_MIN_SIZE;
  const tabStripEnabled = global.tabSetEnableTabStrip !== false;

  const contextValue = useMemo(
    () => ({
      closableTabs: effectiveClosable,
      dispatch: store.dispatch,
      draggableTabsets,
      keepMounted,
      maximizable: effectiveMaximizable,
      maximizedTabsetId: store.model.maximizedTabsetId,
      renamableTabs: effectiveRenamable,
      renderTab,
      renderTabLabel,
      renderTabsetToolbar,
      tabLocation,
      tabsetMinSize,
      tabStripEnabled,
    }),
    [
      draggableTabsets,
      effectiveClosable,
      effectiveMaximizable,
      effectiveRenamable,
      keepMounted,
      renderTab,
      renderTabLabel,
      renderTabsetToolbar,
      store.dispatch,
      store.model.maximizedTabsetId,
      tabLocation,
      tabsetMinSize,
      tabStripEnabled,
    ],
  );

  const handleCommit = store.dispatch;
  const splitDock = global.enableSplitDock !== false;

  const layoutStyle: CSSProperties =
    global.splitterSize === undefined
      ? rootStyle
      : ({ ...rootStyle, "--dashfoo-splitter-size": `${global.splitterSize}px` } as CSSProperties);

  // A maximized tabset fills the frame on its own; otherwise the row tree renders.
  const maximized = store.model.maximizedTabsetId
    ? findTabset(store.model, store.model.maximizedTabsetId)
    : undefined;

  return (
    <DashfooContext.Provider value={contextValue}>
      <DragProvider onCommit={handleCommit} splitDock={splitDock}>
        <div data-dashfoo="layout" style={layoutStyle}>
          {maximized ? <TabsetView node={maximized} /> : <RowView node={store.model.layout} />}
        </div>
      </DragProvider>
    </DashfooContext.Provider>
  );
});

DashfooLayout.displayName = "DashfooLayout";

export { DashfooLayout };
export type { DashfooHandle, DashfooLayoutProps, TabComponent };

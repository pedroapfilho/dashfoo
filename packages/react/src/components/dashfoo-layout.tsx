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

const warnedComponents = new Set<string>();

type DashfooHandle = {
  addTab: (
    tab: TabNode,
    target: { index?: number; location?: DockLocation; targetId: string },
  ) => void;
  canRedo: () => boolean;
  canUndo: () => boolean;
  closeTab: (tabId: string) => void;
  dispatch: (action: Action) => void;

  dockFloat: (floatId: string) => void;

  floatTab: (tabId: string) => void;
  getModel: () => Dashfoo;
  maximizeTabset: (tabsetId: string | null) => void;
  redo: () => void;
  renameTab: (tabId: string, name: string) => void;

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

  editable?: boolean;
  factory?: (tab: TabNode) => ReactNode;

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

  resizableSplits?: boolean;
  responsive?: { maxWidth: number; orientation?: Orientation };

  snap?: SnapConfig;
};

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

          // oxlint-disable-next-line no-console
          console.warn(`[dashfoo] no component registered for "${tab.component}"`);
        }
        return null;
      }
      return <Component node={tab} />;
    },
    [components, factory],
  );

  const [containerRef, width] = useContainerWidth();
  const isCompact = responsive !== undefined && width <= responsive.maxWidth;
  const view = useMemo(
    () => (isCompact ? stackModel(store.model, responsive?.orientation) : store.model),
    [isCompact, responsive?.orientation, store.model],
  );

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

  const maximized = view.maximizedTabsetId ? findTabset(view, view.maximizedTabsetId) : undefined;

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
      {}
      {hasSharedManager ? tree : <DashfooDragProvider>{tree}</DashfooDragProvider>}
    </Layout.Root>
  );
});

DashfooLayout.displayName = "DashfooLayout";

export { DashfooLayout };
export type { DashfooHandle, DashfooLayoutProps, TabComponent };

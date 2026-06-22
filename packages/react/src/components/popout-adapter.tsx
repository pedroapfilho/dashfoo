"use client";

import type {
  Action,
  Dashfoo,
  GlobalAttributes,
  SnapConfig,
  TabNode,
  TabsetNode,
  WindowNode,
} from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import {
  useCallback,
  useContext,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import { LayoutStoreContext, useLayout } from "../hooks/layout-store";
import {
  createPopoutStore,
  PopoutContext,
  usePopout,
  usePopoutWindows,
} from "../hooks/popout-store";
import type { PopoutContextValue } from "../hooks/popout-store";
import { featuresFromGeometry, initPopoutDocument } from "../lib/popout-window";
import { warnOnce } from "../lib/warn-once";

import { LayoutRoot } from "./layout-root";
import { RowView } from "./row-view";
import { DockIcon } from "./tabset-icons";

// The popout adapter: the only place window.open + a child React root live, the
// same way drag-adapter is the only place @dnd-kit lives. Detached windows are
// first-class model nodes (Dashfoo.windows); this layer reconciles those nodes
// with live browser windows and renders each window's layout subtree into its
// popup. Each popup gets its OWN React root (createRoot on its document.body) so
// React's event delegation roots inside that document — a cross-document portal
// would leave clicks/keydown there dead. Drag-dock is intentionally not wired in
// a popup (it would need a per-document @dnd-kit manager): panels there are
// select/close/rename only, with a toolbar "Dock back" button to return them.

const windowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
};

const windowToolbarStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexShrink: 0,
  gap: "0.5rem",
  justifyContent: "flex-end",
};

const windowBodyStyle: CSSProperties = { flex: 1, minHeight: 0, position: "relative" };

const dockButtonStyle: CSSProperties = {
  alignItems: "center",
  cursor: "pointer",
  display: "inline-flex",
  gap: "0.35rem",
};

// Everything one detached window's subtree needs, captured from the host layout
// store. Passed across the root boundary by value (a child root can't read the
// parent tree's React context), then re-provided to the window's own Layout.Root.
type WindowProps = {
  closableTabs: boolean;
  dispatch: (action: Action) => void;
  editable: boolean;
  global: GlobalAttributes;
  keepMounted: boolean;
  renamableTabs: boolean;
  renderTab: (tab: TabNode) => ReactNode;
  renderTabLabel: ((tab: TabNode) => ReactNode) | undefined;
  renderTabsetToolbar: ((tabset: TabsetNode) => ReactNode) | undefined;
  resizableSplits: boolean;
  snap: SnapConfig | null;
};

type WindowMeta = { dispose: () => void; proxy: Window; root: Root };

// Owns the live-window registry and the open/render/release lifecycle. A hook (not
// a component) so the OWNER of the layout can hold it: DashfooLayout creates it and
// hands it to PopoutProvider, which lets the imperative `detachTab` open the popup
// synchronously inside the host's click gesture — the only reliable way past popup
// blockers. `dispatch` feeds the pagehide → reattach path.
const usePopoutManager = (dispatch: (action: Action) => void): PopoutContextValue => {
  const [store] = useState(createPopoutStore);
  // Per-window proxy + child root + disposer, off the render path. Tying the root
  // to the (once-per-window) proxy — not to a component mount — keeps StrictMode's
  // simulated remounts from creating a second root on the same body.
  const metaRef = useRef(new Map<string, WindowMeta>());
  const closingRef = useRef(new Set<string>());

  // The pagehide handler dispatches through the latest dispatch without rebuilding
  // open() each render (the configRef pattern from usePersistence).
  const dispatchRef = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatch;
  });

  const teardown = useCallback((meta: WindowMeta): void => {
    meta.dispose();
    // Defer the unmount + close: synchronously unmounting a child root from
    // within an effect can trip React's "unmount while rendering" guard.
    queueMicrotask(() => {
      try {
        meta.root.unmount();
      } catch {
        // The popup may already be gone (user closed it); nothing to unmount.
      }
      if (!meta.proxy.closed) {
        meta.proxy.close();
      }
    });
  }, []);

  const open = useCallback<PopoutContextValue["open"]>(
    (windowId, geometry) => {
      if (metaRef.current.has(windowId)) {
        return true;
      }
      const popup = window.open("", windowId, featuresFromGeometry(geometry));
      if (!popup) {
        warnOnce(
          "popout-blocked",
          "the browser blocked a detached window; the panel stays docked. Trigger the pop-out from a click.",
        );
        return false;
      }
      const disposeStyles = initPopoutDocument(popup, document.title);
      const handleClose = (): void => {
        if (closingRef.current.has(windowId)) {
          return;
        }
        dispatchRef.current({ type: "reattachWindow", windowId });
      };
      popup.addEventListener("pagehide", handleClose);
      metaRef.current.set(windowId, {
        dispose: () => {
          popup.removeEventListener("pagehide", handleClose);
          disposeStyles();
        },
        proxy: popup,
        root: createRoot(popup.document.body),
      });
      store.setState((state) => ({ windows: { ...state.windows, [windowId]: popup } }));
      return true;
    },
    [store],
  );

  const render = useCallback<PopoutContextValue["render"]>((windowId, element) => {
    metaRef.current.get(windowId)?.root.render(element);
  }, []);

  const release = useCallback<PopoutContextValue["release"]>(
    (windowId) => {
      const meta = metaRef.current.get(windowId);
      if (!meta) {
        return;
      }
      closingRef.current.add(windowId);
      metaRef.current.delete(windowId);
      teardown(meta);
      closingRef.current.delete(windowId);
      store.setState((state) => ({
        windows: Object.fromEntries(
          Object.entries(state.windows).filter(([id]) => id !== windowId),
        ),
      }));
    },
    [store, teardown],
  );

  // Close every popup if the whole layout unmounts. useInsertionEffect (not
  // useEffect) so StrictMode's simulated unmount can't tear down live windows —
  // the lifecycle gotcha the drag manager documents.
  useInsertionEffect(
    () => () => {
      for (const meta of metaRef.current.values()) {
        teardown(meta);
      }
      metaRef.current.clear();
    },
    [teardown],
  );

  return useMemo<PopoutContextValue>(
    () => ({ open, release, render, store }),
    [open, release, render, store],
  );
};

// Provides the popout manager to the tree below. DashfooLayout passes a hoisted
// `manager` (so its imperative API can open in-gesture); a hand-built layout that
// just wraps with PopoutLayer gets a self-created fallback wired to the layout
// store's dispatch.
const PopoutProvider = ({
  children,
  manager,
}: {
  children: ReactNode;
  manager?: PopoutContextValue;
}): ReactNode => {
  const layoutStore = useContext(LayoutStoreContext);
  const fallbackDispatch = useCallback<(action: Action) => void>(
    (action) => layoutStore?.getState().dispatch(action),
    [layoutStore],
  );
  const fallback = usePopoutManager(fallbackDispatch);
  const value = manager ?? fallback;

  return <PopoutContext.Provider value={value}>{children}</PopoutContext.Provider>;
};

// One detached window's chrome + content, rendered in the popup's own root. Takes
// every dependency by value (no parent context across the root boundary) and
// re-provides them to the window's own Layout.Root, with the structural edits
// that need cross-window plumbing (drag, pop-out, maximize) switched off.
const WindowFrame = ({
  node,
  windowProps,
}: {
  node: WindowNode;
  windowProps: WindowProps;
}): ReactNode => {
  const { dispatch, global, snap, ...rootProps } = windowProps;
  const windowModel: Dashfoo = { global, layout: node.layout, version: 1 };

  return (
    <div data-dashfoo="window" style={windowStyle}>
      <div data-dashfoo="window-toolbar" style={windowToolbarStyle}>
        <button
          aria-label="Dock panel back into the main window"
          data-dashfoo="window-dock"
          onClick={() => dispatch({ type: "reattachWindow", windowId: node.id })}
          style={dockButtonStyle}
          type="button"
        >
          <DockIcon />
          Dock back
        </button>
      </div>
      <div data-dashfoo="window-body" style={windowBodyStyle}>
        <LayoutRoot
          {...rootProps}
          dispatch={dispatch}
          draggableTabs={false}
          draggableTabsets={false}
          maximizable={false}
          model={windowModel}
          poppable={false}
          snap={snap ?? undefined}
        >
          <RowView node={node.layout} />
        </LayoutRoot>
      </div>
    </div>
  );
};

type PopoutWindowsProps = { global: GlobalAttributes; windows: Array<WindowNode> };

const PopoutWindowsHost = ({
  ctx,
  global,
  windows,
}: PopoutWindowsProps & { ctx: PopoutContextValue }): ReactNode => {
  const dispatch = useLayout((state) => state.dispatch);
  const editable = useLayout((state) => state.editable);
  const closableTabs = useLayout((state) => state.closableTabs);
  const renamableTabs = useLayout((state) => state.renamableTabs);
  const resizableSplits = useLayout((state) => state.resizableSplits);
  const keepMounted = useLayout((state) => state.keepMounted);
  const renderTab = useLayout((state) => state.renderTab);
  const renderTabLabel = useLayout((state) => state.renderTabLabel);
  const renderTabsetToolbar = useLayout((state) => state.renderTabsetToolbar);
  const snap = useLayout((state) => state.snap);
  const live = usePopoutWindows(ctx.store);

  const windowProps = useMemo<WindowProps>(
    () => ({
      closableTabs,
      dispatch,
      editable,
      global,
      keepMounted,
      renamableTabs,
      renderTab,
      renderTabLabel,
      renderTabsetToolbar,
      resizableSplits,
      snap,
    }),
    [
      closableTabs,
      dispatch,
      editable,
      global,
      keepMounted,
      renamableTabs,
      renderTab,
      renderTabLabel,
      renderTabsetToolbar,
      resizableSplits,
      snap,
    ],
  );

  // Reconcile model windows with live popups. Detach always opens the popup first
  // (the toolbar button and the imperative API both call `open` in-gesture and only
  // dispatch the detach when it succeeds), so a model window WITHOUT a live popup
  // can only be one persisted from a previous session — collapse it back rather
  // than fight the popup blocker to reopen a window the user never re-requested.
  useEffect(() => {
    const ids = new Set<string>();
    for (const node of windows) {
      ids.add(node.id);
      if (live[node.id]) {
        ctx.render(node.id, <WindowFrame node={node} windowProps={windowProps} />);
      } else {
        dispatch({ type: "reattachWindow", windowId: node.id });
      }
    }
    // Close popups whose model window is gone (docked back or already closed).
    for (const id of Object.keys(live)) {
      if (!ids.has(id)) {
        ctx.release(id);
      }
    }
  }, [windows, live, windowProps, dispatch, ctx]);

  // The popups render into their own roots, so nothing renders into the host tree.
  return null;
};

const PopoutWindows = ({ global, windows }: PopoutWindowsProps): ReactNode => {
  const ctx = usePopout();
  if (!ctx) {
    return null;
  }
  return <PopoutWindowsHost ctx={ctx} global={global} windows={windows} />;
};

export { PopoutProvider, PopoutWindows, usePopoutManager };
export type { PopoutWindowsProps };

"use client";

import type { TabsetNode } from "@dashfoo/core";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";

import { useLayout } from "../../hooks/layout-store";
import { useTabOverflow } from "../../hooks/use-tab-overflow";
import { tabDomId } from "../../lib/tab-ids";
import { fallbackSelectedIndex } from "../../lib/tab-selection";
import { useDragSubject, useTabsetDroppable } from "../drag-adapter";

import type { TabsetSnapshot } from "./tabset-store";
import { createTabsetStore, TabsetStoreContext } from "./tabset-store";

// height/width 100% (not flex:1) so the tabset fills its parent whether that
// parent is a flex item or a plain block — rrp wraps panel content in a block
// div, where flex:1 would collapse to content height.
const tabsetStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
};

type TabsetRootProps = ComponentProps<"div"> & { node: TabsetNode };

// Creates the per-tabset store and owns everything that needs the whole tabset:
// the droppable registration, the drag-out selection fallback, overflow
// measurement, and focus restore after a close.
const TabsetRoot = ({
  children,
  node,
  ref: userRef,
  style,
  ...props
}: TabsetRootProps): ReactNode => {
  const closableTabs = useLayout((state) => state.closableTabs);
  const dispatch = useLayout((state) => state.dispatch);
  const maximizable = useLayout((state) => state.maximizable);
  const maximizedTabsetId = useLayout((state) => state.maximizedTabsetId);
  const renamableTabs = useLayout((state) => state.renamableTabs);
  const tabLocation = useLayout((state) => state.tabLocation);

  const { ref } = useTabsetDroppable(node.id);
  const dragSubject = useDragSubject();
  const tabsetRef = useRef<HTMLDivElement | null>(null);

  const isMaximized = maximizedTabsetId === node.id;
  const showMaximize = maximizable && node.enableMaximize !== false;
  const tabsClosable = closableTabs && node.enableClose !== false;
  // Renaming has no tabset-level flag — only the layout flag and per-tab opt-out.
  const tabsRenamable = renamableTabs;

  // While the selected tab is being dragged out of THIS tabset, show a neighbour
  // as active so the strip + content preview "as if that tab were already gone".
  // Purely visual — the model selection is untouched and resumes on drop/cancel.
  const draggingTabIndex =
    dragSubject?.kind === "tab" ? node.children.findIndex((tab) => tab.id === dragSubject.id) : -1;
  const visualSelected =
    draggingTabIndex !== -1 && draggingTabIndex === node.selected
      ? fallbackSelectedIndex(node.children.length, draggingTabIndex)
      : node.selected;
  const activeTab = node.children[visualSelected];
  const isDragSource = dragSubject?.kind === "tabset" && dragSubject.id === node.id;

  const snapshot: TabsetSnapshot = {
    activeTab,
    dispatch,
    isMaximized,
    node,
    showMaximize,
    tabsClosable,
    tabsRenamable,
    visualSelected,
  };
  const [store] = useState(() => createTabsetStore(snapshot));

  // Props→store sync. useLayoutEffect (not useEffect) so subscribers re-render
  // before paint and DOM-focus effects below see fresh state; never during
  // render — setState on an external store mid-render is unsafe.
  useLayoutEffect(() => {
    store.setState(snapshot);
  });

  // Overflow measurement runs here (not in the menu part) because the default
  // composition's toolbar-visibility condition needs the count, and the tablist
  // element registration already lives in the store.
  const tablistElement = useStore(store, (state) => state.tablistElement);
  // A rename or scroll changes clipping without changing the count, so the
  // signature folds each tab's id+name into the deps the hook watches.
  const overflowSignature = node.children.map((tab) => `${tab.id}:${tab.name}`).join("|");
  const overflow = useTabOverflow(tablistElement, overflowSignature);
  // Resolve overflowing ids to names once per change instead of a find() per item.
  const overflowItems = useMemo(() => {
    const names = new Map(node.children.map((tab) => [tab.id, tab.name]));
    return overflow.map((id) => ({ id, name: names.get(id) ?? id }));
  }, [overflow, node.children]);
  useLayoutEffect(() => {
    store.setState({ overflowItems });
  }, [overflowItems, store]);

  // Runs after a closeTab commits. Focus the now-active tab's button, or fall
  // back to the tabset container if the tabset emptied so focus never lands on
  // <body>. Scoped to the root (not the tablist) so tabs rendered outside a
  // tablist still get focus restore.
  useEffect(() => {
    if (!store.getState().restoreFocus) {
      return;
    }
    store.setState({ restoreFocus: false });
    const activeTabId = node.children[node.selected]?.id;
    if (activeTabId) {
      tabsetRef.current
        ?.querySelector<HTMLElement>(`#${CSS.escape(tabDomId(node.id, activeTabId))}`)
        ?.focus();
    } else {
      tabsetRef.current?.focus();
    }
  }, [node.children, node.selected, node.id, store]);

  return (
    <TabsetStoreContext.Provider value={store}>
      <div
        {...props}
        data-dashfoo="tabset"
        data-dragging-source={isDragSource || undefined}
        data-tab-location={tabLocation}
        ref={(element) => {
          ref(element);
          tabsetRef.current = element;
          if (typeof userRef === "function") {
            userRef(element);
          } else if (userRef) {
            userRef.current = element;
          }
        }}
        style={{ ...tabsetStyle, ...style }}
        // -1 so an emptied tabset can receive focus on close without entering the
        // Tab order.
        tabIndex={-1}
      >
        {children}
      </div>
    </TabsetStoreContext.Provider>
  );
};

export { TabsetRoot };
export type { TabsetRootProps };

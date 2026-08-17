"use client";

import type { TabsetNode } from "@dashfoo/core";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";

import { useLayout } from "../../hooks/layout-store";
import { useTabOverflow } from "../../hooks/use-tab-overflow";
import { tabDomId } from "../../lib/tab-ids";
import { fallbackSelectedIndex } from "../../lib/tab-selection";
import { useDragSubject, useTabsetDroppable } from "../drag-provider";

import type { TabsetSnapshot } from "./tabset-store";
import { createTabsetStore, TabsetStoreContext } from "./tabset-store";

const tabsetStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
};

type TabsetRootProps = ComponentProps<"div"> & { node: TabsetNode };

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

  const tabsRenamable = renamableTabs;

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

  useLayoutEffect(() => {
    store.setState(snapshot);
  });

  const tablistElement = useStore(store, (state) => state.tablistElement);

  const overflowSignature = node.children.map((tab) => `${tab.id}:${tab.name}`).join("|");
  const overflow = useTabOverflow(tablistElement, overflowSignature);

  const overflowItems = useMemo(() => {
    const names = new Map(node.children.map((tab) => [tab.id, tab.name]));
    return overflow.map((id) => ({ id, name: names.get(id) ?? id }));
  }, [overflow, node.children]);
  useLayoutEffect(() => {
    store.setState({ overflowItems });
  }, [overflowItems, store]);

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
        tabIndex={-1}
      >
        {children}
      </div>
    </TabsetStoreContext.Provider>
  );
};

export { TabsetRoot };
export type { TabsetRootProps };

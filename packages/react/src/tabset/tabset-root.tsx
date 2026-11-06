"use client";

import type { TabsetNode } from "@dashfoo/core";
import { fallbackSelectedIndex } from "@dashfoo/core";
import type { ComponentProps, ReactNode } from "react";
import { forwardRef, useEffect, useMemo, useRef } from "react";

import { useDraggedNodeId, useTabsetDroppable } from "../drag/drag-hooks";
import { useLayout } from "../layout/layout-store";
import { findTabButton } from "../lib/dom-ids";
import { mergeRefs } from "../lib/merge-refs";
import { useMirroredStore } from "../lib/use-mirrored-store";

import type { TabsetSnapshot } from "./tabset-store";
import { createTabsetStore, TabsetStoreContext } from "./tabset-store";

type TabsetRootProps = ComponentProps<"div"> & { node: TabsetNode };

const TabsetRoot = forwardRef<HTMLDivElement, TabsetRootProps>(
  (
    {
      children,
      node,

      style,
      ...props
    },
    userRef,
  ): ReactNode => {
    const closableTabs = useLayout((state) => state.closableTabs);
    const dispatch = useLayout((state) => state.dispatch);
    const maximizable = useLayout((state) => state.maximizable);
    const maximizedTabsetId = useLayout((state) => state.maximizedTabsetId);
    const renamableTabs = useLayout((state) => state.renamableTabs);
    const tabLocation = useLayout((state) => state.tabLocation);

    const { ref } = useTabsetDroppable(node.id);
    const documentId = useLayout((state) => state.documentId);
    const draggedTabId = useDraggedNodeId("tab");
    const isDragSource = useDraggedNodeId("tabset") === node.id;
    const tabsetRef = useRef<HTMLDivElement | null>(null);

    const isMaximized = maximizedTabsetId === node.id;
    const showMaximize = maximizable && node.enableMaximize !== false;
    const tabsClosable = closableTabs && node.enableClose !== false;

    const draggingTabIndex = node.children.findIndex((tab) => tab.id === draggedTabId);

    const visualSelected =
      draggingTabIndex !== -1 && draggingTabIndex === node.selected
        ? fallbackSelectedIndex(node.children.length, draggingTabIndex)
        : node.selected;

    const activeTab = node.children[visualSelected];

    const snapshot: TabsetSnapshot = {
      activeTab,
      dispatch,
      documentId,
      isMaximized,
      node,
      showMaximize,
      tabsClosable,
      tabsRenamable: renamableTabs,
      visualSelected,
    };

    const store = useMirroredStore(createTabsetStore, snapshot);

    const refCallback = useMemo(
      () => mergeRefs<HTMLDivElement>(ref, tabsetRef, userRef),
      [ref, userRef],
    );

    // Every dispatch rebuilds `node.children`, so this also runs for changes
    // unrelated to a close; the pending id is what keeps a vetoed one from firing.
    useEffect(() => {
      const { pendingCloseTabId } = store.getState();

      if (pendingCloseTabId === null) {
        return;
      }

      store.setState({ pendingCloseTabId: null });

      if (node.children.some((tab) => tab.id === pendingCloseTabId)) {
        return;
      }

      const selectedTab = node.children[node.selected];

      if (selectedTab) {
        findTabButton(tabsetRef.current, documentId, node.id, selectedTab.id)?.focus();
      } else {
        tabsetRef.current?.focus();
      }
    }, [documentId, node.children, node.selected, node.id, store]);

    return (
      <TabsetStoreContext.Provider value={store}>
        <div
          {...props}
          data-dashfoo="tabset"
          data-dragging-source={isDragSource || undefined}
          data-tab-location={tabLocation}
          data-tabset-id={node.id}
          ref={refCallback}
          style={style}
          tabIndex={-1}
        >
          {children}
        </div>
      </TabsetStoreContext.Provider>
    );
  },
);

TabsetRoot.displayName = "TabsetRoot";

export { TabsetRoot };

export type { TabsetRootProps };

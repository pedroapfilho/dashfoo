"use client";

import type { TabsetNode } from "@dashfoo/core";
import { fallbackSelectedIndex } from "@dashfoo/core";
import type { ComponentProps, ReactNode } from "react";
import { forwardRef, useEffect, useMemo, useRef } from "react";

import { useDraggedNodeId, useTabsetDroppable } from "../drag/drag-hooks";
import { tabsetCapabilities } from "../layout/capabilities";
import { useLayout } from "../layout/layout-store";
import { useTabsetSlot } from "../layout/tabset-slot";
import { findTabButton } from "../lib/dom-ids";
import { mergeRefs } from "../lib/merge-refs";
import { PART } from "../lib/parts";
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
    const draggableTabs = useLayout((state) => state.draggableTabs);
    const draggableTabsets = useLayout((state) => state.draggableTabsets);
    const maximizable = useLayout((state) => state.maximizable);
    const maximizedTabsetId = useLayout((state) => state.maximizedTabsetId);
    const renamableTabs = useLayout((state) => state.renamableTabs);
    const selectOnRemove = useLayout((state) => state.selectOnRemove);
    const slot = useTabsetSlot();
    const tabLocation = useLayout((state) => state.tabLocation);

    const { ref } = useTabsetDroppable(node.id);
    const documentId = useLayout((state) => state.documentId);
    const draggedTabId = useDraggedNodeId("tab");
    const isDragSource = useDraggedNodeId("tabset") === node.id;
    const tabsetRef = useRef<HTMLDivElement | null>(null);

    const isMaximized = maximizedTabsetId === node.id;

    const can = useMemo(
      () =>
        tabsetCapabilities(
          { closableTabs, draggableTabs, draggableTabsets, maximizable, renamableTabs },
          node,
        ),
      [closableTabs, draggableTabs, draggableTabsets, maximizable, node, renamableTabs],
    );

    const draggingTabIndex = node.children.findIndex((tab) => tab.id === draggedTabId);

    const visualSelected =
      draggingTabIndex !== -1 && draggingTabIndex === node.selected
        ? fallbackSelectedIndex(node, draggingTabIndex, selectOnRemove)
        : node.selected;

    const activeTab = node.children[visualSelected];

    const snapshot: TabsetSnapshot = {
      activeTab,
      can,
      canCollapse: slot.canCollapse,
      dispatch,
      documentId,
      isCollapsed: slot.collapsed,
      isCollapsedToFit: slot.collapsedToFit,
      isMaximized,
      node,
      showMaximize: can.maximizable && (isMaximized || !slot.alone),
      tabsClosable: can.closableTabs,
      tabsRenamable: can.renamableTabs,
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
          data-collapsed={slot.collapsed ? slot.orientation : undefined}
          data-collapsed-to-fit={slot.collapsedToFit || undefined}
          data-dashfoo={PART.tabset}
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

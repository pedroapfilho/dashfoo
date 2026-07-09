"use client";

import type { TabNode } from "@dashfoo/core";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { useContext, useEffect, useMemo, useRef } from "react";

import { useLayout } from "../../hooks/layout-store";
import { mergeRefs } from "../../lib/merge-refs";
import { panelDomId, tabDomId } from "../../lib/tab-ids";
import { warnOnce } from "../../lib/warn-once";
import { useDragSubject, useTabDraggable } from "../drag-adapter";

import { TabContext, TabsetStoreContext, useTab, useTabset } from "./tabset-store";

type TabsetTabProps = ComponentProps<"span"> & { tab: TabNode };

const TabsetTab = ({ children, ref: userRef, tab, ...props }: TabsetTabProps): ReactNode => {
  const store = useContext(TabsetStoreContext);
  const node = useTabset((state) => state.node);
  const editing = useTabset((state) => state.editingTabId === tab.id);

  const dragSubject = useDragSubject();
  const isDragging = dragSubject?.kind === "tab" && dragSubject.id === tab.id;
  const itemRef = useRef<HTMLSpanElement | null>(null);
  const wasEditing = useRef(false);

  const index = node.children.findIndex((child) => child.id === tab.id);

  const orphanAtRender = index === -1;
  useEffect(() => {
    const settled = store?.getState().node.children.some((child) => child.id === tab.id);
    if (settled === false) {
      warnOnce(
        `orphan-tab-${tab.id}`,
        `<Tabset.Tab> for "${tab.id}" is not a child of its Tabset.Root's node; it renders but can never be selected`,
      );
    }
  }, [orphanAtRender, store, tab.id]);

  useEffect(() => {
    if (wasEditing.current && !editing) {
      itemRef.current?.querySelector<HTMLElement>('[data-dashfoo="tab"]')?.focus();
    }
    wasEditing.current = editing;
  }, [editing]);

  const contextValue = useMemo(() => ({ index, tab }), [index, tab]);
  const refCallback = useMemo(() => mergeRefs<HTMLSpanElement>(itemRef, userRef), [userRef]);

  return (
    <TabContext.Provider value={contextValue}>
      <span
        {...props}
        data-dashfoo="tab-item"
        data-dragging={isDragging || undefined}
        ref={refCallback}
      >
        {children}
      </span>
    </TabContext.Provider>
  );
};

type TabsetTriggerProps = ComponentProps<"button">;

const TabsetTrigger = ({
  children,
  onClick,
  onDoubleClick,
  ref: userRef,
  ...props
}: TabsetTriggerProps): ReactNode => {
  const { index, tab } = useTab();
  const node = useTabset((state) => state.node);
  const editing = useTabset((state) => state.editingTabId === tab.id);
  const selectTab = useTabset((state) => state.selectTab);
  const startEditing = useTabset((state) => state.startEditing);
  const tabsRenamable = useTabset((state) => state.tabsRenamable);
  const visualSelected = useTabset((state) => state.visualSelected);
  const draggableTabs = useLayout((state) => state.draggableTabs);
  const renderTabLabel = useLayout((state) => state.renderTabLabel);
  const { ref } = useTabDraggable(tab.id, !draggableTabs || tab.enableDrag === false, tab.name);
  const refCallback = useMemo(() => mergeRefs<HTMLButtonElement>(ref, userRef), [ref, userRef]);

  if (editing) {
    return null;
  }

  const selected = index === visualSelected;
  const renamable = tabsRenamable && tab.enableRename !== false;

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    selectTab(index);
  };

  const handleDoubleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onDoubleClick?.(event);
    if (renamable) {
      startEditing(tab.id);
    }
  };

  return (
    <button
      aria-label={renderTabLabel ? tab.name : undefined}
      {...props}
      aria-controls={panelDomId(node.id)}
      aria-selected={selected}
      data-dashfoo="tab"
      data-tab-id={tab.id}
      id={tabDomId(node.id, tab.id)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      ref={refCallback}
      role="tab"
      tabIndex={selected ? 0 : -1}
      type="button"
    >
      {children ?? (renderTabLabel ? renderTabLabel(tab) : tab.name)}
    </button>
  );
};

export { TabsetTab, TabsetTrigger };
export type { TabsetTabProps, TabsetTriggerProps };

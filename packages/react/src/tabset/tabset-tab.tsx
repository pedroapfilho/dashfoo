"use client";

import type { TabNode } from "@dashfoo/core";
import { warnOnce } from "@dashfoo/core";
import type { ComponentProps, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { forwardRef, useContext, useEffect, useMemo, useRef } from "react";

import { useDraggedNodeId, useNodeDraggable } from "../drag/drag-hooks";
import { useLayout } from "../layout/layout-store";
import { panelDomId, tabDomId } from "../lib/dom-ids";
import { mergeRefs } from "../lib/merge-refs";
import type { StatefulButtonProps } from "../lib/state-props";
import { resolveStateProps } from "../lib/state-props";
import { CloseIcon } from "../ui/icons";

import {
  canCloseTab,
  canRenameTab,
  TabContext,
  TabsetStoreContext,
  useTab,
  useTabset,
} from "./tabset-store";

type TabsetTabProps = ComponentProps<"span"> & { tab: TabNode };

const TabsetTab = forwardRef<HTMLSpanElement, TabsetTabProps>(
  ({ children, tab, ...props }, userRef): ReactNode => {
    const store = useContext(TabsetStoreContext);
    const node = useTabset((state) => state.node);
    const editing = useTabset((state) => state.editingTabId === tab.id);

    const isDragging = useDraggedNodeId("tab") === tab.id;

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

    const closable = useTabset((state) => canCloseTab(state, tab));
    const renamable = useTabset((state) => canRenameTab(state, tab));
    const draggable = useLayout((state) => state.draggableTabs) && tab.enableDrag !== false;

    const contextValue = useMemo(
      () => ({ closable, draggable, index, renamable, tab }),
      [closable, draggable, index, renamable, tab],
    );

    const refCallback = useMemo(() => mergeRefs<HTMLSpanElement>(itemRef, userRef), [userRef]);

    return (
      <TabContext.Provider value={contextValue}>
        <span
          {...props}
          data-dashfoo="tab-item"
          data-dragging={isDragging || undefined}
          data-tab-id={tab.id}
          ref={refCallback}
        >
          {children}
        </span>
      </TabContext.Provider>
    );
  },
);

TabsetTab.displayName = "TabsetTab";

type TabsetTriggerProps = ComponentProps<"button">;

const TabsetTrigger = forwardRef<HTMLButtonElement, TabsetTriggerProps>(
  (
    {
      children,
      onClick,
      onDoubleClick,
      onKeyDown,

      ...props
    },
    userRef,
  ): ReactNode => {
    const { draggable, index, renamable, tab } = useTab();
    const node = useTabset((state) => state.node);
    const documentId = useTabset((state) => state.documentId);
    const editing = useTabset((state) => state.editingTabId === tab.id);
    const selectTab = useTabset((state) => state.selectTab);
    const startEditing = useTabset((state) => state.startEditing);
    const visualSelected = useTabset((state) => state.visualSelected);
    const renderTabLabel = useLayout((state) => state.renderTabLabel);

    const { ref } = useNodeDraggable("tab", tab.id, { disabled: !draggable, label: tab.name });

    const refCallback = useMemo(() => mergeRefs<HTMLButtonElement>(ref, userRef), [ref, userRef]);

    if (editing) {
      return null;
    }

    const selected = index === visualSelected;

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

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
      onKeyDown?.(event);
      const count = node.children.length;

      if (event.defaultPrevented || count === 0) {
        return;
      }

      // The visual index, not the model's: focus (`tabindex="0"`) sits at that one.
      const from = Math.max(visualSelected, 0);
      const previous = (from - 1 + count) % count;
      const next = (from + 1) % count;
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl";

      const targets = new Map([
        ["ArrowLeft", rtl ? next : previous],
        ["ArrowRight", rtl ? previous : next],
        ["End", count - 1],
        ["Home", 0],
      ]);

      const target = targets.get(event.key);

      if (target === undefined) {
        return;
      }

      event.preventDefault();
      selectTab(target, { focus: true });
    };

    return (
      <button
        aria-label={renderTabLabel ? tab.name : undefined}
        {...props}
        aria-controls={panelDomId(documentId, node.id)}
        aria-selected={selected}
        data-dashfoo="tab"
        data-tab-id={tab.id}
        id={tabDomId(documentId, node.id, tab.id)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        ref={refCallback}
        role="tab"
        tabIndex={selected ? 0 : -1}
        type="button"
      >
        {children ?? (renderTabLabel ? renderTabLabel(tab) : tab.name)}
      </button>
    );
  },
);

TabsetTrigger.displayName = "TabsetTrigger";

type TabsetCloseButtonState = { isSelected: boolean; tab: TabNode };

type TabsetCloseButtonProps = StatefulButtonProps<TabsetCloseButtonState>;

const TabsetCloseButton = forwardRef<HTMLButtonElement, TabsetCloseButtonProps>(
  ({ onClick, ...props }, ref): ReactNode => {
    const { closable, index, tab } = useTab();
    const closeTab = useTabset((state) => state.closeTab);
    const editing = useTabset((state) => state.editingTabId === tab.id);
    const visualSelected = useTabset((state) => state.visualSelected);

    if (!closable || editing) {
      return null;
    }

    const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
      onClick?.(event);

      event.stopPropagation();
      closeTab(tab.id);
    };

    const isSelected = index === visualSelected;
    const { buttonProps, children } = resolveStateProps(props, { isSelected, tab });

    return (
      <button
        aria-label={`Close ${tab.name}`}
        title={`Close ${tab.name}`}
        {...buttonProps}
        data-dashfoo="tab-close"
        onClick={handleClick}
        ref={ref}
        tabIndex={isSelected ? 0 : -1}
        type="button"
      >
        {children ?? <CloseIcon />}
      </button>
    );
  },
);

TabsetCloseButton.displayName = "TabsetCloseButton";

export { TabsetCloseButton, TabsetTab, TabsetTrigger };

export type { TabsetCloseButtonProps, TabsetCloseButtonState, TabsetTabProps, TabsetTriggerProps };

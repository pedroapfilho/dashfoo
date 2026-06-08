"use client";

import type { TabNode, TabsetNode } from "@dashfoo/core";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";

import { useDashfooContext } from "./context";
import { useDragSubject, useTabsetDraggable, useTabsetDroppable } from "./drag-adapter";
import { TabButton } from "./tab-button";
import { panelDomId, tabDomId } from "./tab-ids";
import { TabOverflowMenu } from "./tab-overflow";
import { fallbackSelectedIndex } from "./tab-selection";
import { GripIcon, MaximizeIcon } from "./tabset-icons";
import { useTabOverflow } from "./use-tab-overflow";

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

// The strip is a presentational row: the tablist (the actual tabs) plus room for
// a trailing toolbar. role="tablist" lives on the inner tablist so the toolbar is
// not announced as a tab.
const stripStyle: CSSProperties = { display: "flex", flexShrink: 0 };

const tablistStyle: CSSProperties = { display: "flex", minWidth: 0, overflowX: "auto" };

const contentStyle: CSSProperties = { flex: 1, minHeight: 0, overflow: "auto" };

const toolbarStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexShrink: 0,
  marginInlineStart: "auto",
};

// renderTab is the consumer's content factory; calling it through a component (not
// inline) gives the panel a stable identity so React keeps its state across
// TabsetView re-renders instead of remounting the inline result.
const TabPanel = ({ tab }: { tab: TabNode }): ReactNode => {
  const { renderTab } = useDashfooContext();
  return renderTab(tab);
};

const TabsetView = ({ node }: { node: TabsetNode }): ReactNode => {
  const {
    closableTabs,
    dispatch,
    draggableTabsets,
    keepMounted,
    maximizable,
    maximizedTabsetId,
    renamableTabs,
    renderTabsetToolbar,
    tabLocation,
    tabStripEnabled,
  } = useDashfooContext();
  const { ref } = useTabsetDroppable(node.id);
  const dragSubject = useDragSubject();
  const isMaximized = maximizedTabsetId === node.id;
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabsetRef = useRef<HTMLDivElement>(null);
  // Set when a close was triggered by keyboard/pointer so the post-delete effect
  // knows to move focus to the newly-selected tab (instead of leaving it on body).
  const restoreFocus = useRef(false);
  const tabsClosable = closableTabs && node.enableClose !== false;
  const showMaximize = maximizable && node.enableMaximize !== false;

  // While the selected tab is being dragged out of THIS tabset, show a neighbour
  // as active so the strip + content preview "as if that tab were already gone".
  // Purely visual — the model selection is untouched and resumes on drop/cancel.
  const draggingTabIndex =
    dragSubject?.kind === "tab" ? node.children.findIndex((tab) => tab.id === dragSubject.id) : -1;
  const visualSelected =
    draggingTabIndex !== -1 && draggingTabIndex === node.selected
      ? fallbackSelectedIndex(node.children.length, draggingTabIndex)
      : node.selected;
  const active = node.children[visualSelected];
  const isDragSource = dragSubject?.kind === "tabset" && dragSubject.id === node.id;

  // The grip carries the active tab's name so the drag overlay can label the chip.
  const { ref: gripRef } = useTabsetDraggable(
    node.id,
    !draggableTabsets || isMaximized,
    active?.name ?? "",
  );

  const handleMaximize = (): void => {
    dispatch({ tabsetId: isMaximized ? null : node.id, type: "setMaximizedTabset" });
  };

  // A rename or scroll changes clipping without changing the count, so the
  // signature folds each tab's id+name into the deps the hook watches.
  const overflowSignature = node.children.map((tab) => `${tab.id}:${tab.name}`).join("|");
  const overflow = useTabOverflow(tablistRef, overflowSignature);
  // Resolve overflowing ids to names once per change instead of a find() per item.
  const overflowItems = useMemo(() => {
    const names = new Map(node.children.map((tab) => [tab.id, tab.name]));
    return overflow.map((id) => ({ id, name: names.get(id) ?? id }));
  }, [overflow, node.children]);

  const handleOverflowSelect = (id: string): void => {
    const index = node.children.findIndex((tab) => tab.id === id);
    if (index === -1) {
      return;
    }
    dispatch({ index, tabsetId: node.id, type: "selectTab" });
    tablistRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(tabDomId(node.id, id))}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  // Closing is lifted here (not in TabButton) so we can return focus to the new
  // active tab after the delete re-renders — otherwise focus falls to <body>.
  const handleTabClose = (tabId: string): void => {
    restoreFocus.current = true;
    dispatch({ tabId, type: "deleteTab" });
  };

  // Runs after the delete commits. Focus the now-active tab's button, or fall back
  // to the tabset container if the tabset emptied so focus never lands on <body>.
  useEffect(() => {
    if (!restoreFocus.current) {
      return;
    }
    restoreFocus.current = false;
    const activeTabId = node.children[node.selected]?.id;
    if (activeTabId) {
      tablistRef.current
        ?.querySelector<HTMLElement>(`#${CSS.escape(tabDomId(node.id, activeTabId))}`)
        ?.focus();
    } else {
      tabsetRef.current?.focus();
    }
  }, [node.children, node.selected, node.id]);

  // Roving-tabindex keyboard model (WAI-ARIA APG Tabs): arrows move and select,
  // Home/End jump to the ends, and focus follows the new selection.
  const handleTablistKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // Only act when the key comes from a tab — otherwise a focused close button
    // (a tablist child) would have its arrows/Home/End hijacked.
    if (!(event.target instanceof HTMLElement) || !event.target.closest('[role="tab"]')) {
      return;
    }
    const count = node.children.length;
    if (count === 0) {
      return;
    }
    const targets: Record<string, number> = {
      ArrowLeft: (node.selected - 1 + count) % count,
      ArrowRight: (node.selected + 1) % count,
      End: count - 1,
      Home: 0,
    };
    const next = targets[event.key];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    dispatch({ index: next, tabsetId: node.id, type: "selectTab" });
    const tabId = node.children[next]?.id;
    if (tabId) {
      tablistRef.current
        ?.querySelector<HTMLElement>(`#${CSS.escape(tabDomId(node.id, tabId))}`)
        ?.focus();
    }
  };

  const strip = tabStripEnabled ? (
    <div data-dashfoo="tabstrip" style={stripStyle}>
      <div
        aria-label={node.name ?? "Tabs"}
        aria-orientation="horizontal"
        data-dashfoo="tablist"
        onKeyDown={handleTablistKeyDown}
        ref={tablistRef}
        role="tablist"
        style={tablistStyle}
        tabIndex={-1}
      >
        {node.children.map((tab, index) => (
          <TabButton
            closable={tabsClosable && tab.enableClose !== false}
            index={index}
            key={tab.id}
            onClose={handleTabClose}
            renamable={renamableTabs && tab.enableRename !== false}
            selected={visualSelected}
            tab={tab}
            tabsetId={node.id}
          />
        ))}
      </div>
      {showMaximize ||
      renderTabsetToolbar ||
      overflowItems.length > 0 ||
      (draggableTabsets && !isMaximized) ? (
        <div data-dashfoo="tabset-toolbar" style={toolbarStyle}>
          {overflowItems.length > 0 ? (
            <TabOverflowMenu items={overflowItems} onSelect={handleOverflowSelect} />
          ) : null}
          {draggableTabsets && !isMaximized ? (
            <button aria-label="Move tabset" data-dashfoo="tabset-grip" ref={gripRef} type="button">
              <GripIcon />
            </button>
          ) : null}
          {renderTabsetToolbar?.(node)}
          {showMaximize ? (
            <button
              aria-label={isMaximized ? "Restore" : "Maximize"}
              aria-pressed={isMaximized}
              data-dashfoo="tabset-maximize"
              onClick={handleMaximize}
              type="button"
            >
              <MaximizeIcon maximized={isMaximized} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null;

  // keepMounted renders every panel (inactive ones hidden) so their state
  // survives a tab switch; otherwise only the active panel mounts.
  const renderContent = (): ReactNode => {
    if (keepMounted && node.children.length > 0) {
      return node.children.map((tab, index) => (
        <div
          aria-labelledby={tabDomId(node.id, tab.id)}
          data-dashfoo="tabcontent"
          hidden={index !== visualSelected || undefined}
          id={index === visualSelected ? panelDomId(node.id) : undefined}
          key={tab.id}
          role={index === visualSelected ? "tabpanel" : undefined}
          style={contentStyle}
          tabIndex={index === visualSelected ? 0 : undefined}
        >
          <TabPanel tab={tab} />
        </div>
      ));
    }
    if (active) {
      return (
        <div
          aria-labelledby={tabDomId(node.id, active.id)}
          data-dashfoo="tabcontent"
          id={panelDomId(node.id)}
          role="tabpanel"
          style={contentStyle}
          tabIndex={0}
        >
          <TabPanel tab={active} />
        </div>
      );
    }
    return <div data-dashfoo="tabcontent" style={contentStyle} />;
  };

  const content = renderContent();

  return (
    <div
      data-dashfoo="tabset"
      data-dragging-source={isDragSource || undefined}
      data-tab-location={tabLocation}
      ref={(element) => {
        ref(element);
        tabsetRef.current = element;
      }}
      style={tabsetStyle}
      // -1 so an emptied tabset can receive focus on close without entering the
      // Tab order.
      tabIndex={-1}
    >
      {tabLocation === "bottom" ? (
        <>
          {content}
          {strip}
        </>
      ) : (
        <>
          {strip}
          {content}
        </>
      )}
    </div>
  );
};

export { TabsetView };

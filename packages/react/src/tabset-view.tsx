"use client";

import type { TabNode, TabsetNode } from "@dashfoo/core";
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { useDashfooContext } from "./context";
import { useTabDraggable, useTabsetDroppable } from "./drag-adapter";

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

const tablistStyle: CSSProperties = { display: "flex", minWidth: 0, overflow: "hidden" };

const contentStyle: CSSProperties = { flex: 1, minHeight: 0, overflow: "auto" };

const toolbarStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexShrink: 0,
  marginInlineStart: "auto",
};

const CloseIcon = (): ReactNode => (
  <svg aria-hidden="true" height="10" viewBox="0 0 10 10" width="10">
    <path d="M1.5 1.5l7 7m0-7l-7 7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
  </svg>
);

const MaximizeIcon = ({ maximized }: { maximized: boolean }): ReactNode =>
  maximized ? (
    <svg aria-hidden="true" height="10" viewBox="0 0 10 10" width="10">
      <path
        d="M4 1v3H1m5 5V6h3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
    </svg>
  ) : (
    <svg aria-hidden="true" height="10" viewBox="0 0 10 10" width="10">
      <rect
        fill="none"
        height="7"
        stroke="currentColor"
        strokeWidth="1.2"
        width="7"
        x="1.5"
        y="1.5"
      />
    </svg>
  );

// Inline rename editor. Enter/Escape set `done` so the unmount blur does not
// re-commit after a deliberate commit or cancel.
const TabRenameInput = ({
  name,
  onCancel,
  onCommit,
}: {
  name: string;
  onCancel: () => void;
  onCommit: (value: string) => void;
}): ReactNode => {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      done.current = true;
      onCommit(event.currentTarget.value);
    } else if (event.key === "Escape") {
      done.current = true;
      onCancel();
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (done.current) {
      return;
    }
    done.current = true;
    onCommit(event.currentTarget.value);
  };

  return (
    <input
      aria-label={`Rename ${name}`}
      data-dashfoo="tab-rename"
      defaultValue={name}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      ref={ref}
      type="text"
    />
  );
};

// A single tab — its own component so the draggable hook isn't called in a loop.
// The close control is a sibling button (not nested in the tab button, which
// would be invalid and would pollute the tab's accessible name).
const TabButton = ({
  closable,
  index,
  renamable,
  selected,
  tab,
  tabsetId,
}: {
  closable: boolean;
  index: number;
  renamable: boolean;
  selected: number;
  tab: TabNode;
  tabsetId: string;
}): ReactNode => {
  const { dispatch } = useDashfooContext();
  const { isDragging, ref } = useTabDraggable(tab.id);
  const [editing, setEditing] = useState(false);
  const itemRef = useRef<HTMLSpanElement>(null);
  const wasEditing = useRef(false);

  // Return focus to the tab button once the inline editor closes.
  useEffect(() => {
    if (wasEditing.current && !editing) {
      itemRef.current?.querySelector<HTMLElement>('[data-dashfoo="tab"]')?.focus();
    }
    wasEditing.current = editing;
  }, [editing]);

  const handleSelect = (): void => {
    dispatch({ index, tabsetId, type: "selectTab" });
  };

  const handleDoubleClick = (): void => {
    if (renamable) {
      setEditing(true);
    }
  };

  const handleRenameCommit = (value: string): void => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== tab.name) {
      dispatch({ name: trimmed, tabId: tab.id, type: "renameTab" });
    }
  };

  const handleRenameCancel = (): void => {
    setEditing(false);
  };

  const handleClose = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    dispatch({ tabId: tab.id, type: "deleteTab" });
  };

  return (
    <span data-dashfoo="tab-item" ref={itemRef}>
      {editing ? (
        <TabRenameInput
          name={tab.name}
          onCancel={handleRenameCancel}
          onCommit={handleRenameCommit}
        />
      ) : (
        <button
          aria-selected={index === selected}
          data-dashfoo="tab"
          data-dragging={isDragging || undefined}
          data-tab-id={tab.id}
          onClick={handleSelect}
          onDoubleClick={handleDoubleClick}
          ref={ref}
          role="tab"
          type="button"
        >
          {tab.name}
        </button>
      )}
      {closable && !editing ? (
        <button
          aria-label={`Close ${tab.name}`}
          data-dashfoo="tab-close"
          onClick={handleClose}
          type="button"
        >
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
};

const TabsetView = ({ node }: { node: TabsetNode }): ReactNode => {
  const { closableTabs, dispatch, maximizable, maximizedTabsetId, renamableTabs, renderTab } =
    useDashfooContext();
  const { isDropTarget, ref } = useTabsetDroppable(node.id);
  const active = node.children[node.selected];
  const tabsClosable = closableTabs && node.enableClose !== false;
  const showMaximize = maximizable && node.enableMaximize !== false;
  const isMaximized = maximizedTabsetId === node.id;

  const handleMaximize = (): void => {
    dispatch({ tabsetId: isMaximized ? null : node.id, type: "setMaximizedTabset" });
  };

  return (
    <div
      data-dashfoo="tabset"
      data-drop-target={isDropTarget || undefined}
      ref={ref}
      style={tabsetStyle}
    >
      <div data-dashfoo="tabstrip" style={stripStyle}>
        <div data-dashfoo="tablist" role="tablist" style={tablistStyle}>
          {node.children.map((tab, index) => (
            <TabButton
              closable={tabsClosable}
              index={index}
              key={tab.id}
              renamable={renamableTabs}
              selected={node.selected}
              tab={tab}
              tabsetId={node.id}
            />
          ))}
        </div>
        {showMaximize ? (
          <div data-dashfoo="tabset-toolbar" style={toolbarStyle}>
            <button
              aria-label={isMaximized ? "Restore" : "Maximize"}
              aria-pressed={isMaximized}
              data-dashfoo="tabset-maximize"
              onClick={handleMaximize}
              type="button"
            >
              <MaximizeIcon maximized={isMaximized} />
            </button>
          </div>
        ) : null}
      </div>
      <div data-dashfoo="tabcontent" role="tabpanel" style={contentStyle}>
        {active ? renderTab(active) : null}
      </div>
    </div>
  );
};

export { TabsetView };

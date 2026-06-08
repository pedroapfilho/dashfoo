"use client";

import type { TabNode } from "@dashfoo/core";
import type { FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { useDashfooContext } from "./context";
import { useDragSubject, useTabDraggable } from "./drag-adapter";
import { panelDomId, tabDomId } from "./tab-ids";
import { CloseIcon } from "./tabset-icons";

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

  const handleCommitOnBlur = (event: FocusEvent<HTMLInputElement>): void => {
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
      onBlur={handleCommitOnBlur}
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
  onClose,
  renamable,
  selected,
  tab,
  tabsetId,
}: {
  closable: boolean;
  index: number;
  onClose: (tabId: string) => void;
  renamable: boolean;
  selected: number;
  tab: TabNode;
  tabsetId: string;
}): ReactNode => {
  const { dispatch, renderTabLabel } = useDashfooContext();
  const { ref } = useTabDraggable(tab.id, tab.enableDrag === false, tab.name);
  // `data-dragging` is driven off the drag machine's subject, which is
  // authoritative for the whole drag — the source tab stays in the strip (dimmed)
  // while our overlay chip follows the pointer.
  const dragSubject = useDragSubject();
  const isDragging = dragSubject?.kind === "tab" && dragSubject.id === tab.id;
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

  // Closing is owned by TabsetView so it can restore focus to the new active tab;
  // we only relay the intent.
  const handleClose = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onClose(tab.id);
  };

  return (
    <span data-dashfoo="tab-item" data-dragging={isDragging || undefined} ref={itemRef}>
      {editing ? (
        <TabRenameInput
          name={tab.name}
          onCancel={handleRenameCancel}
          onCommit={handleRenameCommit}
        />
      ) : (
        <button
          aria-controls={panelDomId(tabsetId)}
          aria-label={renderTabLabel ? tab.name : undefined}
          aria-selected={index === selected}
          data-dashfoo="tab"
          data-tab-id={tab.id}
          id={tabDomId(tabsetId, tab.id)}
          onClick={handleSelect}
          onDoubleClick={handleDoubleClick}
          ref={ref}
          role="tab"
          tabIndex={index === selected ? 0 : -1}
          type="button"
        >
          {renderTabLabel ? renderTabLabel(tab) : tab.name}
        </button>
      )}
      {closable && !editing ? (
        <button
          aria-label={`Close ${tab.name}`}
          data-dashfoo="tab-close"
          onClick={handleClose}
          // Roving tabindex: only the active tab's close button is tabbable, so
          // Tab does not stop on a close button inside every tab in the tablist.
          tabIndex={index === selected ? 0 : -1}
          type="button"
        >
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
};

export { TabButton };

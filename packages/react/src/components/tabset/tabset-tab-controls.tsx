"use client";

import type { ComponentProps, FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";

import { mergeRefs } from "../../lib/merge-refs";
import { CloseIcon } from "../tabset-icons";

import { useTab, useTabset } from "./tabset-store";

type TabsetRenameInputProps = ComponentProps<"input">;

// Inline rename editor. Enter/Escape set `done` so the unmount blur does not
// re-commit after a deliberate commit or cancel. A separate inner component so
// each editing session mounts fresh (autofocus + select, reset `done`).
const RenameEditor = ({
  defaultValue,
  onBlur,
  onKeyDown,
  ref: userRef,
  ...props
}: TabsetRenameInputProps): ReactNode => {
  const { tab } = useTab();
  const cancelRename = useTabset((state) => state.cancelRename);
  const commitRename = useTabset((state) => state.commitRename);
  const ref = useRef<HTMLInputElement | null>(null);
  const done = useRef(false);
  const refCallback = useMemo(() => mergeRefs<HTMLInputElement>(ref, userRef), [userRef]);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    onKeyDown?.(event);
    if (event.key === "Enter") {
      done.current = true;
      commitRename(tab.id, event.currentTarget.value);
    } else if (event.key === "Escape") {
      done.current = true;
      cancelRename();
    }
  };

  const handleCommitOnBlur = (event: FocusEvent<HTMLInputElement>): void => {
    onBlur?.(event);
    if (done.current) {
      return;
    }
    done.current = true;
    commitRename(tab.id, event.currentTarget.value);
  };

  return (
    <input
      aria-label={`Rename ${tab.name}`}
      {...props}
      data-dashfoo="tab-rename"
      defaultValue={defaultValue ?? tab.name}
      onBlur={handleCommitOnBlur}
      onKeyDown={handleKeyDown}
      ref={refCallback}
      type="text"
    />
  );
};

// Renders only while its tab is being renamed. Always composed (it registers its
// presence on mount so startEditing can warn when no editor exists), but inert
// until the trigger's double-click flips editingTabId.
const TabsetRenameInput = (props: TabsetRenameInputProps): ReactNode => {
  const { tab } = useTab();
  const editing = useTabset((state) => state.editingTabId === tab.id);
  const registerRenameInput = useTabset((state) => state.registerRenameInput);

  useEffect(() => registerRenameInput(), [registerRenameInput]);

  if (!editing) {
    return null;
  }
  return <RenameEditor {...props} />;
};

type TabsetCloseButtonProps = ComponentProps<"button">;

const TabsetCloseButton = ({ children, onClick, ...props }: TabsetCloseButtonProps): ReactNode => {
  const { index, tab } = useTab();
  const closeTab = useTabset((state) => state.closeTab);
  const editing = useTabset((state) => state.editingTabId === tab.id);
  const tabsClosable = useTabset((state) => state.tabsClosable);
  const visualSelected = useTabset((state) => state.visualSelected);

  const closable = tabsClosable && tab.enableClose !== false;
  if (!closable || editing) {
    return null;
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    // Closing must not bubble into the trigger and select the closing tab.
    event.stopPropagation();
    closeTab(tab.id);
  };

  return (
    <button
      aria-label={`Close ${tab.name}`}
      {...props}
      data-dashfoo="tab-close"
      onClick={handleClick}
      // Roving tabindex: only the active tab's close button is tabbable, so
      // Tab does not stop on a close button inside every tab in the tablist.
      tabIndex={index === visualSelected ? 0 : -1}
      type="button"
    >
      {children ?? <CloseIcon />}
    </button>
  );
};

export { TabsetCloseButton, TabsetRenameInput };
export type { TabsetCloseButtonProps, TabsetRenameInputProps };

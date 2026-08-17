"use client";

import type { ComponentProps, FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";

import { useInlineRename } from "../../hooks/use-inline-rename";
import { mergeRefs } from "../../lib/merge-refs";
import { CloseIcon } from "../close-icon";

import { useTab, useTabset } from "./tabset-store";

type TabsetRenameInputProps = ComponentProps<"input">;

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rename = useInlineRename({
    currentName: tab.name,
    inputRef,
    onCommit: (name) => {
      commitRename(tab.id, name);
    },
    onDone: cancelRename,
  });
  const refCallback = useMemo(() => mergeRefs<HTMLInputElement>(inputRef, userRef), [userRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    onKeyDown?.(event);
    rename.handleKeyDown(event);
  };

  const handleCommitOnBlur = (event: FocusEvent<HTMLInputElement>): void => {
    onBlur?.(event);
    rename.handleBlur(event);
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

    event.stopPropagation();
    closeTab(tab.id);
  };

  return (
    <button
      aria-label={`Close ${tab.name}`}
      title={`Close ${tab.name}`}
      {...props}
      data-dashfoo="tab-close"
      onClick={handleClick}
      tabIndex={index === visualSelected ? 0 : -1}
      type="button"
    >
      {children ?? <CloseIcon />}
    </button>
  );
};

export { RenameEditor, TabsetCloseButton, TabsetRenameInput };
export type { TabsetCloseButtonProps, TabsetRenameInputProps };

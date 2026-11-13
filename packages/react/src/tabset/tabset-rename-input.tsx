"use client";

import type { ComponentProps, FocusEvent, KeyboardEvent, ReactNode } from "react";
import { forwardRef, useEffect, useMemo, useRef } from "react";

import { mergeRefs } from "../lib/merge-refs";
import { useInlineRename } from "../lib/use-inline-rename";

import { useTab, useTabset, useTabsetInternals } from "./tabset-store";

type TabsetRenameInputProps = ComponentProps<"input">;

const RenameEditor = forwardRef<HTMLInputElement, TabsetRenameInputProps>(
  (
    {
      defaultValue,
      onBlur,
      onKeyDown,

      ...props
    },
    userRef,
  ): ReactNode => {
    const { tab } = useTab();
    const renameTab = useTabset((state) => state.renameTab);
    const stopEditing = useTabset((state) => state.stopEditing);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const rename = useInlineRename({
      currentName: tab.name,
      inputRef,
      onCommit: (name) => {
        stopEditing();
        renameTab(tab.id, name);
      },
      onDone: stopEditing,
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
  },
);

RenameEditor.displayName = "RenameEditor";

const TabsetRenameInput = forwardRef<HTMLInputElement, TabsetRenameInputProps>(
  (props, ref): ReactNode => {
    const { tab } = useTab();
    const editing = useTabset((state) => state.editingTabId === tab.id);
    const registerRenameInput = useTabsetInternals((state) => state.registerRenameInput);

    useEffect(() => registerRenameInput(), [registerRenameInput]);

    if (!editing) {
      return null;
    }

    return <RenameEditor {...props} ref={ref} />;
  },
);

TabsetRenameInput.displayName = "TabsetRenameInput";

export { RenameEditor, TabsetRenameInput };

export type { TabsetRenameInputProps };

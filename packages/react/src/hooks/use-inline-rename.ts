"use client";

import type { FocusEvent, KeyboardEvent, RefObject } from "react";
import { useEffect, useRef } from "react";

type InlineRenameOptions = {
  currentName: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onCommit: (name: string) => void;
  onDone: () => void;
};

type InlineRename = {
  handleBlur: (event: FocusEvent<HTMLInputElement>) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

const useInlineRename = ({
  currentName,
  inputRef,
  onCommit,
  onDone,
}: InlineRenameOptions): InlineRename => {
  const done = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [inputRef]);

  const commit = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentName) {
      onCommit(trimmed);
    }
    onDone();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      done.current = true;
      commit(event.currentTarget.value);
    } else if (event.key === "Escape") {
      done.current = true;
      onDone();
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (done.current) {
      return;
    }
    done.current = true;
    commit(event.currentTarget.value);
  };

  return { handleBlur, handleKeyDown };
};

export { useInlineRename };

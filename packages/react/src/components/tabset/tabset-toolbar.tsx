"use client";

import type { ComponentProps, CSSProperties, MouseEvent, ReactNode } from "react";
import { useMemo } from "react";

import { useLayout } from "../../hooks/layout-store";
import { mergeRefs } from "../../lib/merge-refs";
import { useTabsetDraggable } from "../drag-adapter";
import { GripIcon, MaximizeIcon } from "../tabset-icons";

import { useTabset } from "./tabset-store";

const toolbarStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexShrink: 0,
  marginInlineStart: "auto",
};

type TabsetToolbarProps = ComponentProps<"div">;

const TabsetToolbar = ({ style, ...props }: TabsetToolbarProps): ReactNode => (
  <div {...props} data-dashfoo="tabset-toolbar" style={{ ...toolbarStyle, ...style }} />
);

type TabsetGripProps = ComponentProps<"button">;

// The whole tabset is draggable from its grip. It carries the active tab's name
// so the drag overlay can label the chip. Self-hides when tabset dragging is off
// or the tabset is maximized (nowhere to dock).
const TabsetGrip = ({ children, ref: userRef, ...props }: TabsetGripProps): ReactNode => {
  const activeTabName = useTabset((state) => state.activeTab?.name ?? "");
  const isMaximized = useTabset((state) => state.isMaximized);
  const node = useTabset((state) => state.node);
  const draggableTabsets = useLayout((state) => state.draggableTabsets);
  const hidden = !draggableTabsets || isMaximized;
  const { ref } = useTabsetDraggable(node.id, hidden, activeTabName);
  const refCallback = useMemo(() => mergeRefs<HTMLButtonElement>(ref, userRef), [ref, userRef]);

  if (hidden) {
    return null;
  }

  return (
    <button
      aria-label="Move tabset"
      {...props}
      data-dashfoo="tabset-grip"
      ref={refCallback}
      type="button"
    >
      {children ?? <GripIcon />}
    </button>
  );
};

type TabsetMaximizeButtonProps = ComponentProps<"button">;

const TabsetMaximizeButton = ({
  children,
  onClick,
  ...props
}: TabsetMaximizeButtonProps): ReactNode => {
  const isMaximized = useTabset((state) => state.isMaximized);
  const showMaximize = useTabset((state) => state.showMaximize);
  const toggleMaximize = useTabset((state) => state.toggleMaximize);

  if (!showMaximize) {
    return null;
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    toggleMaximize();
  };

  return (
    <button
      aria-label={isMaximized ? "Restore" : "Maximize"}
      {...props}
      aria-pressed={isMaximized}
      data-dashfoo="tabset-maximize"
      onClick={handleClick}
      type="button"
    >
      {children ?? <MaximizeIcon maximized={isMaximized} />}
    </button>
  );
};

export { TabsetGrip, TabsetMaximizeButton, TabsetToolbar };
export type { TabsetGripProps, TabsetMaximizeButtonProps, TabsetToolbarProps };

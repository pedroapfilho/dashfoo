"use client";

import { createNodeId } from "@dashfoo/core";
import type { ComponentProps, CSSProperties, MouseEvent, ReactNode } from "react";
import { useMemo } from "react";

import { useLayout } from "../../hooks/layout-store";
import { usePopout } from "../../hooks/popout-store";
import { mergeRefs } from "../../lib/merge-refs";
import { measureGeometry } from "../../lib/popout-window";
import { useTabsetDraggable } from "../drag-adapter";
import { GripIcon, MaximizeIcon, PopoutIcon } from "../tabset-icons";

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

type TabsetPopoutButtonProps = ComponentProps<"button">;

// Pops the whole tabset out into a detached window. window.open runs inside this
// click (so the popup blocker allows it) and pre-registers the proxy under a
// fresh id; the matching detachTabset carries that id so the model node binds to
// the window just opened. Self-hides when popping is off or the tabset is
// maximized (a maximized panel already owns the frame).
const TabsetPopoutButton = ({
  children,
  onClick,
  ...props
}: TabsetPopoutButtonProps): ReactNode => {
  const poppable = useLayout((state) => state.poppable);
  const dispatch = useLayout((state) => state.dispatch);
  const isMaximized = useTabset((state) => state.isMaximized);
  const node = useTabset((state) => state.node);
  const popout = usePopout();

  if (!poppable || isMaximized) {
    return null;
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    const tabsetElement = event.currentTarget.closest<HTMLElement>('[data-dashfoo="tabset"]');
    const geometry = measureGeometry(tabsetElement);
    const windowId = createNodeId("window");
    // Open synchronously inside the gesture, then detach to the same id — but only
    // when the window actually opened, so a blocked popup leaves the panel docked.
    if (popout?.open(windowId, geometry)) {
      dispatch({ geometry, tabsetId: node.id, type: "detachTabset", windowId });
    }
  };

  return (
    <button
      aria-label="Open panel in a new window"
      {...props}
      data-dashfoo="tabset-popout"
      onClick={handleClick}
      type="button"
    >
      {children ?? <PopoutIcon />}
    </button>
  );
};

export { TabsetGrip, TabsetMaximizeButton, TabsetPopoutButton, TabsetToolbar };
export type {
  TabsetGripProps,
  TabsetMaximizeButtonProps,
  TabsetPopoutButtonProps,
  TabsetToolbarProps,
};

"use client";

import type { ComponentProps, CSSProperties, MouseEvent, ReactNode } from "react";
import { useMemo } from "react";

import { useLayout } from "../../hooks/layout-store";
import { measureFloatRect } from "../../lib/float-geometry";
import { mergeRefs } from "../../lib/merge-refs";
import { warnOnce } from "../../lib/warn-once";
import { useTabsetDraggable } from "../drag-adapter";
import { useHasFloatLayer } from "../float-context";
import { FloatIcon, GripIcon, MaximizeIcon } from "../tabset-icons";

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
      title="Move tabset"
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
      title={isMaximized ? "Restore tabset" : "Maximize tabset"}
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

type TabsetFloatButtonProps = ComponentProps<"button">;

// Floats the whole tabset out into a draggable, resizable overlay (dispatches
// `floatTabset` with a rect measured over the panel). Self-hides when floating is
// off or the tabset is maximized (a maximized panel already owns the frame).
const TabsetFloatButton = ({ children, onClick, ...props }: TabsetFloatButtonProps): ReactNode => {
  const floatable = useLayout((state) => state.floatable);
  const dispatch = useLayout((state) => state.dispatch);
  const isMaximized = useTabset((state) => state.isMaximized);
  const node = useTabset((state) => state.node);
  const hasFloatLayer = useHasFloatLayer();

  if (!floatable || isMaximized) {
    return null;
  }

  // `floatable` is on but there is no <Layout.FloatLayer> to render the float (a
  // hand-built layout that forgot it — DashfooLayout always adds one). Hide the
  // control and warn rather than render a button that would float a panel into
  // nowhere.
  if (!hasFloatLayer) {
    warnOnce(
      "float-no-layer",
      "Tabset.FloatButton needs a <Layout.FloatLayer> around the layout (DashfooLayout adds one); the float control is hidden",
    );
    return null;
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    const geometry = measureFloatRect(event.currentTarget);
    dispatch({ geometry, tabsetId: node.id, type: "floatTabset" });
  };

  return (
    <button
      aria-label="Float panel"
      title="Float panel"
      {...props}
      data-dashfoo="tabset-float"
      onClick={handleClick}
      type="button"
    >
      {children ?? <FloatIcon />}
    </button>
  );
};

export { TabsetFloatButton, TabsetGrip, TabsetMaximizeButton, TabsetToolbar };
export type {
  TabsetFloatButtonProps,
  TabsetGripProps,
  TabsetMaximizeButtonProps,
  TabsetToolbarProps,
};

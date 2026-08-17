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

type TabsetChrome = { float: boolean; grip: boolean; maximize: boolean; overflow: boolean };

/**
 * One answer per control, so the layout that decides whether to render a toolbar
 * at all and the controls that decide whether to render themselves cannot
 * disagree. They already did: only the float button knew about `hasFloatLayer`,
 * so a floatable tabset with no `<Layout.FloatLayer>` drew an empty toolbar that
 * the theme still pads.
 */
const useTabsetChrome = (): TabsetChrome => {
  const draggableTabsets = useLayout((state) => state.draggableTabsets);
  const floatable = useLayout((state) => state.floatable);
  const isMaximized = useTabset((state) => state.isMaximized);
  const overflowCount = useTabset((state) => state.overflowItems.length);
  const showMaximize = useTabset((state) => state.showMaximize);
  const hasFloatLayer = useHasFloatLayer();

  if (floatable && !isMaximized && !hasFloatLayer) {
    warnOnce(
      "float-no-layer",
      "Tabset.FloatButton needs a <Layout.FloatLayer> around the layout (DashfooLayout adds one); the float control is hidden",
    );
  }

  return {
    float: floatable && !isMaximized && hasFloatLayer,
    grip: draggableTabsets && !isMaximized,
    maximize: showMaximize,
    overflow: overflowCount > 0,
  };
};

type TabsetGripProps = ComponentProps<"button">;

const TabsetGrip = ({ children, ref: userRef, ...props }: TabsetGripProps): ReactNode => {
  const activeTabName = useTabset((state) => state.activeTab?.name ?? "");
  const node = useTabset((state) => state.node);
  const { grip } = useTabsetChrome();
  const { ref } = useTabsetDraggable(node.id, !grip, activeTabName);
  const refCallback = useMemo(() => mergeRefs<HTMLButtonElement>(ref, userRef), [ref, userRef]);

  if (!grip) {
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
  const toggleMaximize = useTabset((state) => state.toggleMaximize);
  const { maximize } = useTabsetChrome();

  if (!maximize) {
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

const TabsetFloatButton = ({ children, onClick, ...props }: TabsetFloatButtonProps): ReactNode => {
  const dispatch = useLayout((state) => state.dispatch);
  const node = useTabset((state) => state.node);
  const { float } = useTabsetChrome();

  if (!float) {
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

export { TabsetFloatButton, TabsetGrip, TabsetMaximizeButton, TabsetToolbar, useTabsetChrome };
export type {
  TabsetChrome,
  TabsetFloatButtonProps,
  TabsetGripProps,
  TabsetMaximizeButtonProps,
  TabsetToolbarProps,
};

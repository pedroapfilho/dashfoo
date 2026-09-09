"use client";

import type { ComponentProps, CSSProperties, MouseEvent, ReactNode } from "react";
import { forwardRef, useMemo } from "react";

import { useLayout } from "../../hooks/layout-store";
import { measureFloatRect } from "../../lib/float-geometry";
import { mergeRefs } from "../../lib/merge-refs";
import { warnOnce } from "../../lib/warn-once";
import { FloatIcon, GripIcon, MaximizeIcon } from "../close-icon";
import { useTabsetDraggable } from "../drag-provider";
import { useHasFloatLayer } from "../float-context";

import { useTabset } from "./tabset-store";

const toolbarStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexShrink: 0,
  marginInlineStart: "auto",
};

type TabsetToolbarProps = ComponentProps<"div">;

const TabsetToolbar = forwardRef<HTMLDivElement, TabsetToolbarProps>(
  ({ style, ...props }, ref): ReactNode => (
    <div {...props} data-dashfoo="tabset-toolbar" ref={ref} style={{ ...toolbarStyle, ...style }} />
  ),
);

TabsetToolbar.displayName = "TabsetToolbar";

type TabsetChrome = { float: boolean; grip: boolean; maximize: boolean; overflow: boolean };

/**
 * One answer per control, shared by the controls and by the layout deciding
 * whether to render a toolbar at all, so the two cannot disagree.
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

const TabsetGrip = forwardRef<HTMLButtonElement, TabsetGripProps>(
  ({ children, ...props }, userRef): ReactNode => {
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
  },
);

TabsetGrip.displayName = "TabsetGrip";

type TabsetMaximizeButtonProps = ComponentProps<"button">;

const TabsetMaximizeButton = forwardRef<HTMLButtonElement, TabsetMaximizeButtonProps>(
  ({ children, onClick, ...props }, ref): ReactNode => {
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
        ref={ref}
        type="button"
      >
        {children ?? <MaximizeIcon maximized={isMaximized} />}
      </button>
    );
  },
);

TabsetMaximizeButton.displayName = "TabsetMaximizeButton";

type TabsetFloatButtonProps = ComponentProps<"button">;

const TabsetFloatButton = forwardRef<HTMLButtonElement, TabsetFloatButtonProps>(
  ({ children, onClick, ...props }, ref): ReactNode => {
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
        ref={ref}
        type="button"
      >
        {children ?? <FloatIcon />}
      </button>
    );
  },
);

TabsetFloatButton.displayName = "TabsetFloatButton";

export { TabsetFloatButton, TabsetGrip, TabsetMaximizeButton, TabsetToolbar, useTabsetChrome };
export type {
  TabsetChrome,
  TabsetFloatButtonProps,
  TabsetGripProps,
  TabsetMaximizeButtonProps,
  TabsetToolbarProps,
};

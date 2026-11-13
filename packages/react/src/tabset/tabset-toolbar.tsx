"use client";

import type { TabsetNode } from "@dashfoo/core";
import { warnOnce } from "@dashfoo/core/internal";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { forwardRef, useMemo } from "react";

import { useDraggedNodeId, useNodeDraggable } from "../drag/drag-hooks";
import { useHasFloatLayer } from "../float/float-context";
import { measureFloatRect } from "../float/float-geometry";
import { useLayout } from "../layout/layout-store";
import { panelDomId } from "../lib/dom-ids";
import { mergeRefs } from "../lib/merge-refs";
import type { StatefulButtonProps } from "../lib/state-props";
import { resolveStateProps } from "../lib/state-props";
import { CollapseIcon, FloatIcon, GripIcon, MaximizeIcon } from "../ui/icons";

import { useTabset, useTabsetInternals } from "./tabset-store";

type TabsetToolbarProps = ComponentProps<"div">;

const TabsetToolbar = forwardRef<HTMLDivElement, TabsetToolbarProps>(
  ({ style, ...props }, ref): ReactNode => (
    <div {...props} data-dashfoo="tabset-toolbar" ref={ref} style={style} />
  ),
);

TabsetToolbar.displayName = "TabsetToolbar";

type TabsetChrome = {
  collapse: boolean;
  float: boolean;
  grip: boolean;
  maximize: boolean;
  overflow: boolean;
};

const tabsetDragLabel = (node: TabsetNode, activeTabName: string): string =>
  node.children.length > 1 ? `${activeTabName} (+${node.children.length - 1})` : activeTabName;

/**
 * One answer per control, shared by the controls and by the layout deciding
 * whether to render a toolbar at all, so the two cannot disagree.
 */
const useTabsetChrome = (): TabsetChrome => {
  const floatable = useLayout((state) => state.floatable);
  const isMaximized = useTabset((state) => state.isMaximized);
  const draggable = useTabsetInternals((state) => state.can.draggable);
  const overflowCount = useTabset((state) => state.overflowItems.length);
  const showMaximize = useTabset((state) => state.showMaximize);
  const hasFloatLayer = useHasFloatLayer();

  const collapse = useTabset(
    (state) => state.canCollapse || (state.isCollapsed && !state.isCollapsedToFit),
  );

  if (floatable && !isMaximized && !hasFloatLayer) {
    warnOnce(
      "float-no-layer",
      "Tabset.FloatButton needs a <Layout.FloatLayer> around the layout (DashfooLayout adds one); the float control is hidden",
    );
  }

  return {
    collapse,
    float: floatable && !isMaximized && hasFloatLayer,
    grip: draggable && !isMaximized,
    maximize: showMaximize,
    overflow: overflowCount > 0,
  };
};

type TabsetDrag = { grip: boolean; label: string; node: TabsetNode };

const useTabsetDrag = (): TabsetDrag => {
  const activeTabName = useTabset((state) => state.activeTab?.name ?? "");
  const node = useTabset((state) => state.node);
  const { grip } = useTabsetChrome();

  return { grip, label: tabsetDragLabel(node, activeTabName), node };
};

type TabsetGripState = { isDragging: boolean };

type TabsetGripProps = StatefulButtonProps<TabsetGripState>;

const TabsetGrip = forwardRef<HTMLButtonElement, TabsetGripProps>((props, userRef): ReactNode => {
  const { grip, label, node } = useTabsetDrag();
  const isDragging = useDraggedNodeId("tabset") === node.id;
  const { ref } = useNodeDraggable("tabset", node.id, { disabled: !grip, handle: "grip", label });
  const refCallback = useMemo(() => mergeRefs<HTMLButtonElement>(ref, userRef), [ref, userRef]);

  if (!grip) {
    return null;
  }

  const { buttonProps, children } = resolveStateProps(props, { isDragging });

  return (
    <button
      aria-label="Move tabset"
      title="Move tabset"
      {...buttonProps}
      data-dashfoo="tabset-grip"
      ref={refCallback}
      type="button"
    >
      {children ?? <GripIcon />}
    </button>
  );
});

TabsetGrip.displayName = "TabsetGrip";

type TabsetMaximizeButtonState = { isMaximized: boolean };

type TabsetMaximizeButtonProps = StatefulButtonProps<TabsetMaximizeButtonState>;

const TabsetMaximizeButton = forwardRef<HTMLButtonElement, TabsetMaximizeButtonProps>(
  ({ onClick, ...props }, ref): ReactNode => {
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

    const { buttonProps, children } = resolveStateProps(props, { isMaximized });

    return (
      <button
        aria-label={isMaximized ? "Restore" : "Maximize"}
        title={isMaximized ? "Restore tabset" : "Maximize tabset"}
        {...buttonProps}
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

type TabsetCollapseButtonState = { isCollapsed: boolean };

type TabsetCollapseButtonProps = StatefulButtonProps<TabsetCollapseButtonState>;

const TabsetCollapseButton = forwardRef<HTMLButtonElement, TabsetCollapseButtonProps>(
  ({ onClick, ...props }, ref): ReactNode => {
    const documentId = useTabset((state) => state.documentId);
    const isCollapsed = useTabset((state) => state.isCollapsed);
    const node = useTabset((state) => state.node);
    const toggleCollapsed = useTabset((state) => state.toggleCollapsed);
    const { collapse } = useTabsetChrome();

    if (!collapse) {
      return null;
    }

    const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
      onClick?.(event);
      toggleCollapsed();
    };

    const { buttonProps, children } = resolveStateProps(props, { isCollapsed });

    return (
      <button
        aria-label={isCollapsed ? "Expand" : "Collapse"}
        title={isCollapsed ? "Expand tabset" : "Collapse tabset"}
        {...buttonProps}
        aria-controls={panelDomId(documentId, node.id)}
        aria-expanded={!isCollapsed}
        data-dashfoo="tabset-collapse"
        onClick={handleClick}
        ref={ref}
        type="button"
      >
        {children ?? <CollapseIcon collapsed={isCollapsed} />}
      </button>
    );
  },
);

TabsetCollapseButton.displayName = "TabsetCollapseButton";

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

export {
  TabsetCollapseButton,
  TabsetFloatButton,
  TabsetGrip,
  TabsetMaximizeButton,
  TabsetToolbar,
  useTabsetChrome,
  useTabsetDrag,
};

export type {
  TabsetCollapseButtonProps,
  TabsetCollapseButtonState,
  TabsetFloatButtonProps,
  TabsetGripProps,
  TabsetGripState,
  TabsetMaximizeButtonProps,
  TabsetMaximizeButtonState,
  TabsetToolbarProps,
};

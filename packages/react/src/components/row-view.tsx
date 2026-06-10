"use client";

import type { Dimension, RowNode } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import { Fragment, useLayoutEffect, useRef } from "react";
import type { Layout, Orientation, PanelImperativeHandle } from "react-resizable-panels";
import { Group, Panel, Separator } from "react-resizable-panels";

import { useDashfooContext } from "../hooks/context";

import { TabsetView } from "./tabset-view";

// This module is the resize adapter: the only place that imports
// react-resizable-panels. It maps the model's responsive weights to rrp's
// percentage layout and unit-typed min/max constraints to rrp sizes, and commits
// a drag (on release) back to the document as an adjustSplit action.

const dimensionToSize = (dimension: Dimension): string => `${dimension.value}${dimension.unit}`;

const groupStyle: CSSProperties = { display: "flex", flex: 1, minHeight: 0, minWidth: 0 };
const WEIGHT_EPSILON = 0.01;

const sameIds = (left: Array<string>, right: Array<string>): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
};

const RowView = ({ node }: { node: RowNode }): ReactNode => {
  const { dispatch, tabsetMinSize } = useDashfooContext();
  const orientation: Orientation = node.orientation === "row" ? "horizontal" : "vertical";
  const total = node.children.reduce((sum, child) => sum + (child.weight ?? 1), 0);
  const panelRefs = useRef(new Map<string, PanelImperativeHandle | null>());
  const separatorListeners = useRef(new WeakMap<HTMLElement, EventListener>());
  const syncing = useRef(false);

  // rrp fires onLayoutChanged once on mount with its measured layout. That is not
  // a user resize — committing it would rewrite the authored weights and push a
  // spurious undo entry — so the first call (per mount) is ignored.
  const measured = useRef(false);

  const handleLayoutChanged = (layout: Layout): void => {
    if (syncing.current) {
      return;
    }
    if (!measured.current) {
      measured.current = true;
      return;
    }
    const hasCollapsibleChild = node.children.some(
      (child) => child.type === "tabset" && child.collapsible,
    );
    const collapsedIds = hasCollapsibleChild
      ? node.children.flatMap((child) => {
          if (child.type !== "tabset" || !child.collapsible) {
            return [];
          }
          return panelRefs.current.get(child.id)?.isCollapsed() ? [child.id] : [];
        })
      : undefined;
    const collapsedSet = new Set(collapsedIds);
    const weights = node.children.map((child) =>
      child.type === "tabset" && collapsedSet.has(child.id)
        ? (child.weight ?? 1)
        : (layout[child.id] ?? child.weight ?? 1),
    );
    const weightsChanged = weights.some(
      (weight, index) => Math.abs(weight - (node.children[index]?.weight ?? 1)) > WEIGHT_EPSILON,
    );
    const modelCollapsedIds = node.children.flatMap((child) =>
      child.type === "tabset" && child.collapsed ? [child.id] : [],
    );
    const collapsedChanged =
      collapsedIds === undefined ? false : !sameIds(collapsedIds, modelCollapsedIds);

    if (!weightsChanged && !collapsedChanged) {
      return;
    }

    dispatch({
      ...(collapsedIds === undefined ? {} : { collapsedIds }),
      rowId: node.id,
      type: "adjustSplit",
      weights,
    });
  };

  const collapseSignature = node.children
    .map((child) => `${child.id}${child.type === "tabset" && child.collapsed ? "!" : ""}`)
    .join("|");

  useLayoutEffect(() => {
    let changed = false;
    for (const child of node.children) {
      if (child.type !== "tabset" || !child.collapsible) {
        continue;
      }
      const handle = panelRefs.current.get(child.id);
      if (!handle) {
        continue;
      }
      const isCollapsed = handle.isCollapsed();
      const percent = ((child.weight ?? 1) / total) * 100;
      if (child.collapsed && !isCollapsed) {
        syncing.current = true;
        changed = true;
        handle.collapse();
      } else if (!child.collapsed && isCollapsed) {
        syncing.current = true;
        changed = true;
        handle.expand();
        requestAnimationFrame(() => {
          handle.resize(`${percent}%`);
        });
      }
    }
    if (!changed) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      syncing.current = false;
    });
    return () => {
      cancelAnimationFrame(frame);
      syncing.current = false;
    };
  }, [collapseSignature, node.children, total]);

  const handleSeparatorDoubleClick = (targetId: string): void => {
    const target = node.children.find((child) => child.id === targetId);
    if (target?.type !== "tabset" || !target.collapsible) {
      return;
    }
    const handle = panelRefs.current.get(targetId);
    const isCollapsed = handle?.isCollapsed() ?? target.collapsed === true;
    const targetPercent = ((target.weight ?? 1) / total) * 100;
    if (isCollapsed) {
      handle?.expand();
      requestAnimationFrame(() => {
        handle?.resize(`${targetPercent}%`);
      });
    } else {
      handle?.collapse();
    }
    const collapsedIds = node.children.flatMap((child) => {
      if (child.type !== "tabset" || !child.collapsible) {
        return [];
      }
      if (child.id === targetId) {
        return isCollapsed ? [] : [child.id];
      }
      return child.collapsed ? [child.id] : [];
    });
    dispatch({
      collapsedIds,
      rowId: node.id,
      type: "adjustSplit",
      weights: node.children.map((child) => child.weight ?? 1),
    });
  };

  return (
    <Group
      data-dashfoo="row"
      key={node.children.map((child) => child.id).join("|")}
      onLayoutChanged={handleLayoutChanged}
      orientation={orientation}
      style={groupStyle}
    >
      {node.children.map((child, index) => {
        const previousChild = node.children[index - 1];
        const collapsedAdjacent =
          (previousChild?.type === "tabset" && previousChild.collapsed === true) ||
          (child.type === "tabset" && child.collapsed === true);
        const percent = ((child.weight ?? 1) / total) * 100;
        let min = child.min ? dimensionToSize(child.min) : undefined;
        if (min === undefined && child.type === "tabset" && tabsetMinSize !== undefined) {
          min = `${tabsetMinSize}px`;
        }
        const max = child.max ? dimensionToSize(child.max) : undefined;

        return (
          <Fragment key={child.id}>
            {index > 0 ? (
              <Separator
                data-collapsed-adjacent={collapsedAdjacent || undefined}
                data-dashfoo="splitter"
                disableDoubleClick
                elementRef={(element) => {
                  if (!element) {
                    return;
                  }
                  const existing = separatorListeners.current.get(element);
                  if (existing) {
                    element.removeEventListener("dblclick", existing);
                  }
                  const listener = (event: Event): void => {
                    event.preventDefault();
                    const previous = node.children[index - 1];
                    if (previous?.type === "tabset" && previous.collapsible) {
                      handleSeparatorDoubleClick(previous.id);
                    }
                  };
                  separatorListeners.current.set(element, listener);
                  element.addEventListener("dblclick", listener);
                }}
              />
            ) : null}
            <Panel
              collapsedSize={
                child.type === "tabset" && child.collapsedSize
                  ? dimensionToSize(child.collapsedSize)
                  : undefined
              }
              collapsible={child.type === "tabset" ? child.collapsible : undefined}
              defaultSize={`${percent}%`}
              id={child.id}
              maxSize={max}
              minSize={min}
              panelRef={(handle) => {
                panelRefs.current.set(child.id, handle);
              }}
            >
              {child.type === "row" ? <RowView node={child} /> : <TabsetView node={child} />}
            </Panel>
          </Fragment>
        );
      })}
    </Group>
  );
};

export { RowView };

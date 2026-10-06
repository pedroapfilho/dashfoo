"use client";

import type { Dashfoo, Orientation, RowNode } from "@dashfoo/core";
import { useEffect, useMemo, useState } from "react";

type ResponsiveOptions = { maxWidth: number; orientation?: Orientation };

type ResponsiveLayout = {
  isCompact: boolean;
  maximizable: boolean;
  model: Dashfoo;
  restructurable: boolean;
  rootRef: (element: HTMLElement | null) => void;
};

const observeWidth = (element: HTMLElement, onWidth: (width: number) => void): (() => void) => {
  const observer = new ResizeObserver((entries) => {
    const entry = entries.at(0);
    if (entry) {
      onWidth(entry.contentRect.width);
    }
  });
  observer.observe(element);
  return () => {
    observer.disconnect();
  };
};

/** Seeds an infinite width so the server render and the first client render agree on the wide layout. */
const useContainerWidth = (): [(element: HTMLElement | null) => void, number] => {
  const [width, setWidth] = useState<number>(Number.POSITIVE_INFINITY);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!container) {
      return undefined;
    }
    // React 18 replays effects without replaying callback refs in StrictMode.
    // Create and disconnect the observer in the same lifecycle.
    return observeWidth(container, setWidth);
  }, [container]);

  return [setContainer, width];
};

const compactRow = (node: RowNode, orientation: Orientation): RowNode => {
  const children = node.children.map((child) =>
    child.type === "row" ? compactRow(child, orientation) : { ...child, weight: 1 },
  );
  return {
    ...node,
    children,
    orientation,
    weight: children.reduce((sum, child) => sum + child.weight, 0),
  };
};

// Flattening the tree would reparent nested tabsets in React and lose widget
// state. Keep every ancestor and distribute space by descendant count.
const compactModel = (model: Dashfoo, orientation: Orientation): Dashfoo => ({
  ...model,
  layout: compactRow(model.layout, orientation),
  maximizedTabsetId: undefined,
});

/**
 * The compact view is a projection: dispatch still targets the canonical
 * model, so widening restores the arrangement. Docking, resizing, floating and
 * maximizing are desktop interactions, so compact locks them all.
 */
const useResponsiveLayout = (
  model: Dashfoo,
  options: ResponsiveOptions | undefined,
): ResponsiveLayout => {
  const [rootRef, width] = useContainerWidth();
  const isCompact = options !== undefined && width <= options.maxWidth;
  const orientation = options?.orientation ?? "column";

  return useMemo(
    () =>
      isCompact
        ? {
            isCompact,
            maximizable: false,
            model: compactModel(model, orientation),
            restructurable: false,
            rootRef,
          }
        : { isCompact, maximizable: true, model, restructurable: true, rootRef },
    [isCompact, model, orientation, rootRef],
  );
};

export { useResponsiveLayout };
export type { ResponsiveLayout, ResponsiveOptions };

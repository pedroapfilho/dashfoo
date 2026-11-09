"use client";

import type { Dashfoo, Orientation, RowNode } from "@dashfoo/core";
import { useEffect, useMemo, useState } from "react";

import type { LayoutOptions } from "./layout-root";

type ResponsiveOptions = { maxWidth: number; orientation?: Orientation };

/** `locks` overrides the layout's own options, so spread it last onto `Layout.Root`. */
type ResponsiveLayout = {
  isCompact: boolean;
  locks: Pick<LayoutOptions, "maximizable" | "restructurable">;
  model: Dashfoo;
  rootRef: (element: HTMLElement | null) => void;
};

const COMPACT_LOCKS = { maximizable: false, restructurable: false } as const;

/**
 * Holds which side of the `maxWidth` it was measured against the container is
 * on, so resizing within a side re-renders nothing and a new breakpoint never
 * shows a stale side. Starts wide, so the server and first client render agree.
 */
const useBelowWidth = (
  maxWidth: number | undefined,
): [(element: HTMLElement | null) => void, boolean] => {
  const [reading, setReading] = useState<{ below: boolean; maxWidth: number } | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!container || maxWidth === undefined) {
      return undefined;
    }

    // React 18 replays effects without replaying callback refs in StrictMode.
    // Create and disconnect the observer in the same lifecycle.
    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0);

      if (entry) {
        const below = entry.contentRect.width <= maxWidth;

        setReading((previous) =>
          previous?.below === below && previous.maxWidth === maxWidth
            ? previous
            : { below, maxWidth },
        );
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [container, maxWidth]);

  return [setContainer, reading !== null && reading.maxWidth === maxWidth && reading.below];
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
  const [rootRef, isCompact] = useBelowWidth(options?.maxWidth);
  const orientation = options?.orientation ?? "column";

  return useMemo(
    () =>
      isCompact
        ? { isCompact, locks: COMPACT_LOCKS, model: compactModel(model, orientation), rootRef }
        : { isCompact, locks: {}, model, rootRef },
    [isCompact, model, orientation, rootRef],
  );
};

export { useResponsiveLayout };

export type { ResponsiveLayout, ResponsiveOptions };

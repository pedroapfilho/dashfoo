"use client";

import type { Dashfoo } from "@dashfoo/core";
import { useCallback, useEffect, useRef, useState } from "react";

type Breakpoint = {
  // When true, the active breakpoint locks every structural interaction (tab and
  // tabset drag, split resize) — the lock-on-mobile model. Pair it with a stacked
  // model so the narrow view is read-only and tap-navigable. Defaults to false.
  compact?: boolean;
  id: string;
  model: Dashfoo;
  query?: { maxWidth: number } | { media: string };
};

type UseResponsiveModelOptions = { breakpoints: Array<Breakpoint> };

type ResponsiveModel = {
  breakpoint: string;
  containerRef: (element: HTMLElement | null) => void;
  draggableTabs: boolean;
  draggableTabsets: boolean;
  isCompact: boolean;
  model: Dashfoo;
  resizableSplits: boolean;
};

const hasMatchMedia = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

// Whether a breakpoint applies at a given container width. No query = catch-all;
// a maxWidth matches at or below the width; a media query consults matchMedia.
const matchBreakpoint = (breakpoint: Breakpoint, width: number): boolean => {
  const { query } = breakpoint;
  if (!query) {
    return true;
  }
  if ("maxWidth" in query) {
    return width <= query.maxWidth;
  }
  return hasMatchMedia() && window.matchMedia(query.media).matches;
};

// The first breakpoint that matches, else the last (the expected catch-all).
const activeBreakpoint = (breakpoints: Array<Breakpoint>, width: number): Breakpoint => {
  const fallback = breakpoints.at(-1);
  if (!fallback) {
    throw new Error("useResponsiveModel requires at least one breakpoint.");
  }
  return breakpoints.find((breakpoint) => matchBreakpoint(breakpoint, width)) ?? fallback;
};

// Tracks a single element's content-box width via ResizeObserver. Seeds
// POSITIVE_INFINITY so server and first client render agree on the widest
// breakpoint (no hydration mismatch, no compact flash on desktop); the observer
// supplies the real width on mount. The returned ref callback is stable.
const useContainerWidth = (): [(element: HTMLElement | null) => void, number] => {
  const [width, setWidth] = useState<number>(Number.POSITIVE_INFINITY);
  const observerRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback((element: HTMLElement | null): void => {
    observerRef.current?.disconnect();
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    observerRef.current = observer;
  }, []);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  return [containerRef, width];
};

// Picks a model for the active breakpoint, keyed off the container's own width
// (ResizeObserver) and/or media queries, and derives the structural-interaction
// flags from the breakpoint's `compact`. Feed model + flags onto DashfooLayout
// (or Layout.Root) as reactive props and attach containerRef to the wrapper —
// no key/remount, so store, history, and tab state survive a breakpoint cross.
const useResponsiveModel = ({ breakpoints }: UseResponsiveModelOptions): ResponsiveModel => {
  const [containerRef, width] = useContainerWidth();
  const [, setMediaTick] = useState(0);

  useEffect(() => {
    if (!hasMatchMedia()) {
      return;
    }
    const lists = breakpoints.flatMap((breakpoint) =>
      breakpoint.query && "media" in breakpoint.query
        ? [window.matchMedia(breakpoint.query.media)]
        : [],
    );
    if (lists.length === 0) {
      return;
    }
    const handleChange = (): void => {
      setMediaTick((tick) => tick + 1);
    };
    for (const list of lists) {
      list.addEventListener("change", handleChange);
    }
    return () => {
      for (const list of lists) {
        list.removeEventListener("change", handleChange);
      }
    };
  }, [breakpoints]);

  const active = activeBreakpoint(breakpoints, width);
  const isCompact = active.compact === true;
  return {
    breakpoint: active.id,
    containerRef,
    draggableTabs: !isCompact,
    draggableTabsets: !isCompact,
    isCompact,
    model: active.model,
    resizableSplits: !isCompact,
  };
};

export { activeBreakpoint, matchBreakpoint, useContainerWidth, useResponsiveModel };
export type { Breakpoint, ResponsiveModel, UseResponsiveModelOptions };

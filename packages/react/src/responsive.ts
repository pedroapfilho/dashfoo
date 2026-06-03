"use client";

import type { Dashfoo } from "@dashfoo/core";
import { useCallback, useEffect, useRef, useState } from "react";

type Breakpoint = {
  id: string;
  model: Dashfoo;
  query?: { maxWidth: number } | { media: string };
};

type UseResponsiveModelOptions = { breakpoints: Array<Breakpoint> };

type ResponsiveModel = {
  breakpoint: string;
  containerRef: (element: HTMLElement | null) => void;
  defaultModel: Dashfoo;
  key: string;
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

// Picks a model for the active breakpoint, keyed off the container's own width
// (ResizeObserver) and/or media queries. Use it like usePersistedModel: spread
// the result onto DashfooLayout and remount on `key`.
const useResponsiveModel = ({ breakpoints }: UseResponsiveModelOptions): ResponsiveModel => {
  const [width, setWidth] = useState<number>(() =>
    typeof window === "undefined" ? Number.POSITIVE_INFINITY : window.innerWidth,
  );
  const [, setMediaTick] = useState(0);
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
  return { breakpoint: active.id, containerRef, defaultModel: active.model, key: active.id };
};

export { activeBreakpoint, matchBreakpoint, useResponsiveModel };
export type { Breakpoint, ResponsiveModel, UseResponsiveModelOptions };

"use client";

import type { Dashfoo } from "@dashfoo/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Breakpoint = {
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

const activeBreakpoint = (breakpoints: Array<Breakpoint>, width: number): Breakpoint => {
  const fallback = breakpoints.at(-1);
  if (!fallback) {
    throw new Error("useResponsiveModel requires at least one breakpoint.");
  }
  return breakpoints.find((breakpoint) => matchBreakpoint(breakpoint, width)) ?? fallback;
};

const useContainerWidth = (): [(element: HTMLElement | null) => void, number] => {
  const [width, setWidth] = useState<number>(Number.POSITIVE_INFINITY);
  const observerRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback((element: HTMLElement | null): void => {
    observerRef.current?.disconnect();
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0);
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

const useResponsiveModel = ({ breakpoints }: UseResponsiveModelOptions): ResponsiveModel => {
  const [containerRef, width] = useContainerWidth();
  const [, setMediaTick] = useState(0);

  useEffect(() => {
    if (!hasMatchMedia()) {
      return undefined;
    }
    const lists = breakpoints.flatMap((breakpoint) =>
      breakpoint.query && "media" in breakpoint.query
        ? [window.matchMedia(breakpoint.query.media)]
        : [],
    );
    if (lists.length === 0) {
      return undefined;
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

  return useMemo(() => {
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
  }, [active, containerRef]);
};

export { activeBreakpoint, matchBreakpoint, useContainerWidth, useResponsiveModel };
export type { Breakpoint, ResponsiveModel, UseResponsiveModelOptions };

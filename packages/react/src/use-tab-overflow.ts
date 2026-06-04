"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";

// The ids of the tabs whose right edge is past the tablist's visible right edge
// (i.e. clipped). +1 absorbs sub-pixel rounding. One pass: keep the id only when
// the tab is both overflowing and identifiable.
const overflowingIds = (tablist: Element): Array<string> => {
  const rightEdge = tablist.getBoundingClientRect().right;
  return [...tablist.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].flatMap((tab) =>
    tab.getBoundingClientRect().right > rightEdge + 1 && tab.dataset.tabId
      ? [tab.dataset.tabId]
      : [],
  );
};

// Recomputes the overflowing ids when the tablist resizes or its tab count
// changes. Returns [] until measured (and in jsdom, where rects are 0).
const useTabOverflow = (
  tablistRef: RefObject<HTMLElement | null>,
  tabCount: number,
): Array<string> => {
  const [overflow, setOverflow] = useState<Array<string>>([]);

  useEffect(() => {
    const element = tablistRef.current;
    if (!element) {
      return;
    }
    const recompute = (): void => {
      setOverflow(overflowingIds(element));
    };
    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [tablistRef, tabCount]);

  return overflow;
};

export { overflowingIds, useTabOverflow };

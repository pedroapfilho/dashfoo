"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";

// The ids of the tabs clipped by the tablist's visible box — past the right edge
// OR scrolled off before the left edge. +/-1 absorbs sub-pixel rounding. One
// pass: keep the id only when the tab is both overflowing and identifiable.
const overflowingIds = (tablist: Element): Array<string> => {
  const box = tablist.getBoundingClientRect();
  return [...tablist.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].flatMap((tab) => {
    const rect = tab.getBoundingClientRect();
    const clipped = rect.right > box.right + 1 || rect.left < box.left - 1;
    return clipped && tab.dataset.tabId ? [tab.dataset.tabId] : [];
  });
};

// Recomputes the overflowing ids when the tablist resizes, scrolls, or its tab
// labels/widths change. `signature` folds tab id+name so renames recompute even
// when the count is unchanged. Returns [] until measured (and in jsdom, where
// rects are 0).
const useTabOverflow = (
  tablistRef: RefObject<HTMLElement | null>,
  signature: string,
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
    // Scrolling the strip changes which tabs are clipped on the left/right without
    // resizing it, so listen for scroll too.
    element.addEventListener("scroll", recompute, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", recompute);
    };
  }, [tablistRef, signature]);

  return overflow;
};

export { overflowingIds, useTabOverflow };

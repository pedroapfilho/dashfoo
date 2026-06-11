"use client";

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
// labels/widths change. Takes the element (not a ref) so a tablist that mounts
// late — or is swapped by a custom composition — re-arms the observers.
// `signature` folds tab id+name so renames recompute even when the count is
// unchanged. Returns [] until measured (and in jsdom, where rects are 0).
const useTabOverflow = (tablist: HTMLElement | null, signature: string): Array<string> => {
  const [overflow, setOverflow] = useState<Array<string>>([]);

  useEffect(() => {
    // No tablist (e.g. the strip is disabled) means nothing can overflow.
    const recompute = (): void => {
      setOverflow((previous) => {
        const next = tablist ? overflowingIds(tablist) : [];
        return next.length === 0 && previous.length === 0 ? previous : next;
      });
    };
    recompute();
    if (!tablist) {
      return;
    }
    const observer = new ResizeObserver(recompute);
    observer.observe(tablist);
    // Scrolling the strip changes which tabs are clipped on the left/right without
    // resizing it, so listen for scroll too.
    tablist.addEventListener("scroll", recompute, { passive: true });
    return () => {
      observer.disconnect();
      tablist.removeEventListener("scroll", recompute);
    };
  }, [tablist, signature]);

  return overflow;
};

export { overflowingIds, useTabOverflow };

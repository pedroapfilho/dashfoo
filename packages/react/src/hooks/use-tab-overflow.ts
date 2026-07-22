"use client";

import { useEffect, useState } from "react";

const overflowingIds = (tablist: Element): Array<string> => {
  const box = tablist.getBoundingClientRect();
  return [...tablist.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].flatMap((tab) => {
    const rect = tab.getBoundingClientRect();
    const clipped = rect.right > box.right + 1 || rect.left < box.left - 1;
    const tabId = tab.dataset.tabId;
    return clipped && tabId !== undefined && tabId !== "" ? [tabId] : [];
  });
};

const useTabOverflow = (tablist: HTMLElement | null, signature: string): Array<string> => {
  const [overflow, setOverflow] = useState<Array<string>>([]);

  useEffect(() => {
    const recompute = (): void => {
      setOverflow((previous) => {
        const next = tablist ? overflowingIds(tablist) : [];
        return next.length === 0 && previous.length === 0 ? previous : next;
      });
    };
    recompute();
    if (!tablist) {
      return undefined;
    }
    const observer = new ResizeObserver(recompute);
    observer.observe(tablist);

    tablist.addEventListener("scroll", recompute, { passive: true });
    return () => {
      observer.disconnect();
      tablist.removeEventListener("scroll", recompute);
    };
  }, [tablist, signature]);

  return overflow;
};

export { overflowingIds, useTabOverflow };

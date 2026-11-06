"use client";

import type { TabNode } from "@dashfoo/core";
import { useEffect, useLayoutEffect, useRef } from "react";

import type { OverflowItem } from "./tabset-store";

const TAB_SELECTOR = '[data-dashfoo="tab"]';

const overflowingIds = (tablist: Element): Array<string> => {
  const box = tablist.getBoundingClientRect();

  return [...tablist.querySelectorAll<HTMLElement>(TAB_SELECTOR)].flatMap((tab) => {
    const rect = tab.getBoundingClientRect();
    const clipped = rect.right > box.right + 1 || rect.left < box.left - 1;
    const tabId = tab.dataset.tabId;

    return clipped && tabId !== undefined && tabId !== "" ? [tabId] : [];
  });
};

const tabsKey = (tabs: ReadonlyArray<{ id: string; name: string }>): string =>
  tabs.map((tab) => `${tab.id}:${tab.name}`).join("\n");

/**
 * Reports the tabs `tablist` clips. It watches every tab item as well as the
 * strip, so a label that changes width is caught without the strip resizing;
 * the items outlive a rename, the buttons inside them do not.
 */
const useTabOverflow = (
  tablist: HTMLElement | null,
  tabs: Array<TabNode>,
  onChange: (items: Array<OverflowItem>) => void,
): void => {
  const latestTabs = useRef(tabs);

  useLayoutEffect(() => {
    latestTabs.current = tabs;
  });

  // Every dispatch rebuilds `tabs`, so the effect keys on what it reads from them.
  const key = tabsKey(tabs);

  useEffect(() => {
    const names = new Map(latestTabs.current.map((tab) => [tab.id, tab.name]));
    let reported = "";

    // Fires per frame while an overflowing strip scrolls, so an unchanged set
    // is not reported again.
    const recompute = (): void => {
      const ids = tablist ? overflowingIds(tablist) : [];
      const items = ids.map((id) => ({ id, name: names.get(id) ?? id }));
      const next = tabsKey(items);

      if (next !== reported) {
        reported = next;
        onChange(items);
      }
    };

    recompute();

    if (!tablist) {
      return undefined;
    }

    const observer = new ResizeObserver(recompute);
    observer.observe(tablist);

    for (const item of tablist.querySelectorAll('[data-dashfoo="tab-item"]')) {
      observer.observe(item);
    }

    tablist.addEventListener("scroll", recompute, { passive: true });

    return () => {
      observer.disconnect();
      tablist.removeEventListener("scroll", recompute);

      if (reported !== "") {
        onChange([]);
      }
    };
  }, [key, onChange, tablist]);
};

export { overflowingIds, useTabOverflow };

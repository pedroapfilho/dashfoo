"use client";

import type { TabNode } from "@dashfoo/core";
import { useLayoutEffect, useRef } from "react";

import { cssPixels } from "../lib/css-pixels";
import { isHTMLElement } from "../lib/dom";

type TablistSpaceListener = (space: number) => void;

/** Each tabset's last measured tablist space, readable and subscribable from outside the layout. */
type TablistSpace = {
  get: (tabsetId: string) => number | undefined;
  set: (tabsetId: string, space: number | undefined) => void;
  subscribe: (tabsetId: string, listener: TablistSpaceListener) => () => void;
};

const createTablistSpace = (): TablistSpace => {
  const values = new Map<string, number>();
  const listeners = new Map<string, Set<TablistSpaceListener>>();

  return {
    get: (tabsetId) => values.get(tabsetId),
    set: (tabsetId, space) => {
      if (space === undefined) {
        values.delete(tabsetId);

        return;
      }

      values.set(tabsetId, space);

      for (const listener of listeners.get(tabsetId) ?? []) {
        listener(space);
      }
    },
    subscribe: (tabsetId, listener) => {
      const own = listeners.get(tabsetId) ?? new Set();
      own.add(listener);
      listeners.set(tabsetId, own);

      return () => {
        own.delete(listener);
      };
    },
  };
};

const TAB_ITEM_SELECTOR = '[data-dashfoo="tab-item"]';

const horizontalPadding = (element: HTMLElement): number => {
  const style = getComputedStyle(element);

  return cssPixels(style.paddingLeft) + cssPixels(style.paddingRight);
};

/** The width `tablist` would take to show every tab: their extent plus its padding. */
const tablistNeed = (tablist: HTMLElement): number => {
  const items = [...tablist.querySelectorAll<HTMLElement>(TAB_ITEM_SELECTOR)];
  const first = items[0];
  const last = items.at(-1);
  const extent = first && last ? last.offsetLeft + last.offsetWidth - first.offsetLeft : 0;

  return extent + horizontalPadding(tablist);
};

/**
 * Layout pixels the tabs leave free in the strip: its content width minus what
 * every part needs at its natural size. Measured against the strip rather than
 * the tablist, because the tablist shrinks to its tabs and the space between
 * them and the toolbar belongs to the strip. Negative once the tabs overflow,
 * and still falling when the strip's other parts overflow it too.
 */
const measureTablistSpace = (tablist: HTMLElement): number => {
  const strip = tablist.closest<HTMLElement>('[data-dashfoo="tabstrip"]');

  if (!strip) {
    return tablist.clientWidth - tablistNeed(tablist);
  }

  const parts = [...strip.children].filter(isHTMLElement);
  const gap = cssPixels(getComputedStyle(strip).columnGap) * Math.max(0, parts.length - 1);

  // A part's auto margin absorbs the free space, so only border boxes count.
  const needed = parts.reduce(
    (sum, part) =>
      sum +
      (part.contains(tablist)
        ? part.offsetWidth - tablist.offsetWidth + tablistNeed(tablist)
        : part.offsetWidth),
    0,
  );

  return strip.clientWidth - horizontalPadding(strip) - gap - needed;
};

const TABLIST_SPACE_PROPERTY = "--dashfoo-tablist-space";

/**
 * Remeasures whenever the tablist, its strip, the strip's other parts or a tab
 * resizes. ResizeObserver callbacks and layout effects both run before paint,
 * so `onChange` and the custom property never show a stale frame.
 */
const useTablistSpace = (
  tablist: HTMLElement | null,
  tabs: Array<TabNode>,
  onChange: (space: number | undefined) => void,
): void => {
  const reported = useRef<number | undefined>(undefined);
  const key = tabs.map((tab) => tab.id).join("\n");

  useLayoutEffect(() => {
    if (!tablist) {
      return undefined;
    }

    const measure = (): void => {
      const space = measureTablistSpace(tablist);
      tablist.style.setProperty(TABLIST_SPACE_PROPERTY, `${space}px`);

      if (space !== reported.current) {
        reported.current = space;
        onChange(space);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tablist);
    const strip = tablist.closest('[data-dashfoo="tabstrip"]');

    for (const element of [
      ...(strip?.children ?? []),
      ...tablist.querySelectorAll(TAB_ITEM_SELECTOR),
    ]) {
      observer.observe(element);
    }

    if (strip) {
      observer.observe(strip);
    }

    return () => {
      observer.disconnect();
    };
  }, [key, onChange, tablist]);

  useLayoutEffect(
    () => () => {
      reported.current = undefined;
      onChange(undefined);
    },
    [onChange],
  );
};

export { createTablistSpace, useTablistSpace };

export type { TablistSpace, TablistSpaceListener };

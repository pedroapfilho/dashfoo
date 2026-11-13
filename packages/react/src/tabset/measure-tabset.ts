import type { Direction, MeasuredTab, MeasuredTabset } from "@dashfoo/core";

import { closestPart, ownPart, PART, partsIn } from "../lib/parts";

const measureTabs = (strip: HTMLElement): Array<MeasuredTab> =>
  partsIn(strip, PART.tabItem).flatMap((item) => {
    const id = item.dataset.tabId;

    return id === undefined ? [] : [{ id, rect: item.getBoundingClientRect() }];
  });

const directionOf = (element: Element): Direction =>
  getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";

/** The one DOM read behind both the drop intent and the dock indicator, so the index and the line agree. */
const measureTabset = (id: string, element: HTMLElement): MeasuredTabset => {
  const strip = ownPart(element, PART.tabset, PART.tabstrip);

  return {
    direction: directionOf(element),
    id,
    rect: element.getBoundingClientRect(),
    strip: strip ? { rect: strip.getBoundingClientRect(), tabs: measureTabs(strip) } : null,
  };
};

/**
 * The outermost row holding `tabsetElement` within its own layout, so a layout
 * nested in a tab measures its own edges rather than its host's.
 */
const measureRootRow = (tabsetElement: HTMLElement): DOMRect | null => {
  const layout = closestPart(tabsetElement, PART.layout);
  let root: HTMLElement | null = null;

  for (
    let row = closestPart(tabsetElement, PART.row);
    row !== null && layout?.contains(row) === true;
    row = row.parentElement && closestPart(row.parentElement, PART.row)
  ) {
    root = row;
  }

  return root?.getBoundingClientRect() ?? null;
};

export { measureRootRow, measureTabset };

import type { Direction, MeasuredLayout, MeasuredTab, MeasuredTabset } from "@dashfoo/core";

const LAYOUT_SELECTOR = '[data-dashfoo="layout"]';
const ROW_SELECTOR = '[data-dashfoo="row"]';
const TABSET_SELECTOR = '[data-dashfoo="tabset"]';

/** A layout nested in a tab's content holds strips too; only this tabset's own strip counts. */
const ownStrip = (element: HTMLElement): HTMLElement | undefined =>
  [...element.querySelectorAll<HTMLElement>('[data-dashfoo="tabstrip"]')].find(
    (strip) => strip.closest(TABSET_SELECTOR) === element,
  );

const measureTabs = (strip: HTMLElement): Array<MeasuredTab> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab-item"]')].flatMap((item) => {
    const id = item.dataset.tabId;

    return id === undefined ? [] : [{ id, rect: item.getBoundingClientRect() }];
  });

const directionOf = (element: Element): Direction =>
  getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";

/** The one DOM read behind both the drop intent and the dock indicator, so the index and the line agree. */
const measureTabset = (id: string, element: HTMLElement): MeasuredTabset => {
  const strip = ownStrip(element);

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
const measureLayout = (tabsetElement: HTMLElement): MeasuredLayout | null => {
  const layout = tabsetElement.closest(LAYOUT_SELECTOR);
  let root: HTMLElement | null = null;

  for (
    let row = tabsetElement.closest<HTMLElement>(ROW_SELECTOR);
    row !== null && layout?.contains(row) === true;
    row = row.parentElement?.closest<HTMLElement>(ROW_SELECTOR) ?? null
  ) {
    root = row;
  }

  const id = root?.dataset.rowId;

  if (!root || id === undefined) {
    return null;
  }

  const tabsetCount = [...root.querySelectorAll(TABSET_SELECTOR)].filter(
    (tabset) => tabset.closest(LAYOUT_SELECTOR) === layout,
  ).length;

  return { id, rect: root.getBoundingClientRect(), tabsetCount };
};

export { measureLayout, measureTabset };

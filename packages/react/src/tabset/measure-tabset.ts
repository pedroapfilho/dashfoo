import type { MeasuredTab, MeasuredTabset } from "@dashfoo/core";

/** A layout nested in a tab's content holds strips too; only this tabset's own strip counts. */
const ownStrip = (element: HTMLElement): HTMLElement | undefined =>
  [...element.querySelectorAll<HTMLElement>('[data-dashfoo="tabstrip"]')].find(
    (strip) => strip.closest('[data-dashfoo="tabset"]') === element,
  );

const measureTabs = (strip: HTMLElement): Array<MeasuredTab> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab-item"]')].flatMap((item) => {
    const id = item.dataset.tabId;

    return id === undefined ? [] : [{ id, rect: item.getBoundingClientRect() }];
  });

/** The one DOM read behind both the drop intent and the dock indicator, so the index and the line agree. */
const measureTabset = (id: string, element: HTMLElement): MeasuredTabset => {
  const strip = ownStrip(element);

  return {
    id,
    rect: element.getBoundingClientRect(),
    strip: strip ? { rect: strip.getBoundingClientRect(), tabs: measureTabs(strip) } : null,
  };
};

export { measureTabset };

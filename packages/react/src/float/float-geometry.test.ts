import { afterEach, expect, test, vi } from "vitest";

import { measureFloatRect } from "./float-geometry";

const box = (element: HTMLElement, rect: DOMRect, layout: Record<string, number> = {}): void => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(rect);

  for (const [key, value] of Object.entries(layout)) {
    Object.defineProperty(element, key, { configurable: true, value });
  }
};

afterEach(() => {
  document.body.replaceChildren();
});

test("a new float opens over its tabset in the overlay's layout pixels under a 2x scale", () => {
  const layout = document.createElement("div");
  layout.dataset.dashfoo = "layout";
  const tabset = document.createElement("div");
  tabset.dataset.dashfoo = "tabset";
  const button = document.createElement("button");
  const overlay = document.createElement("div");
  overlay.dataset.dashfoo = "float-overlay";
  tabset.append(button);
  layout.append(tabset, overlay);
  document.body.append(layout);

  box(overlay, new DOMRect(100, 50, 1600, 1200), {
    clientHeight: 600,
    clientWidth: 800,
    offsetHeight: 600,
    offsetWidth: 800,
  });
  box(tabset, new DOMRect(300, 250, 800, 400));

  expect(measureFloatRect(button)).toEqual({ height: 200, left: 116, top: 116, width: 400 });
});

import { describe, expect, test } from "vitest";

import { measureHeader, sharesOf } from "./collapse-geometry";

const BORDER = 2;

const part = (name: string, height: number, children: Array<HTMLElement> = []): HTMLElement => {
  const element = document.createElement("div");
  element.dataset.dashfoo = name;
  Object.defineProperty(element, "offsetHeight", { value: height });
  Object.defineProperty(element, "clientHeight", { value: height - BORDER });
  element.append(...children);

  return element;
};

describe("measureHeader", () => {
  test("measures the tabset's own strip, not the strip of a layout nested in its content", () => {
    const nested = part("layout", 200, [part("tabset", 200, [part("tabstrip", 99)])]);
    const panel = document.createElement("div");

    panel.append(part("tabset", 240, [part("tabcontent", 200, [nested]), part("tabstrip", 32)]));

    expect(measureHeader(panel, false)).toBe(32 + BORDER);
  });
});

describe("sharesOf", () => {
  test("collapsed panels keep their size and the rest is shared by weight", () => {
    expect(
      sharesOf([
        { fixed: 10, weight: 5 },
        { fixed: undefined, weight: 1 },
        { fixed: undefined, weight: 2 },
      ]),
    ).toEqual([10, 30, 60]);
  });
});

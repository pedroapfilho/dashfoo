import { afterEach, describe, expect, test } from "vitest";

import { measureFloatRect } from "../float/float-geometry";

import { isElement, isHTMLElement, isNode } from "./dom";

const popupDocument = (): { frame: HTMLIFrameElement; view: Window } => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const view = frame.contentWindow;

  if (!view) {
    throw new Error("jsdom gave the iframe no window");
  }

  return { frame, view };
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("cross-window guards", () => {
  test("recognize nodes created by another window's document", () => {
    const { view } = popupDocument();
    const element = view.document.createElement("div");

    expect(element instanceof HTMLElement).toBe(false);
    expect(isNode(element)).toBe(true);
    expect(isElement(element)).toBe(true);
    expect(isHTMLElement(element)).toBe(true);
  });

  test("reject text nodes, SVG elements and plain values", () => {
    expect(isElement(document.createTextNode("x"))).toBe(false);
    expect(isHTMLElement(document.createElementNS("http://www.w3.org/2000/svg", "svg"))).toBe(
      false,
    );
    expect(isNode({ nodeType: "1" })).toBe(false);
  });
});

describe("measureFloatRect", () => {
  test("clamps against the element's own window, not the opener's", () => {
    const { view } = popupDocument();
    Object.defineProperty(view, "innerWidth", { value: 300 });
    Object.defineProperty(view, "innerHeight", { value: 200 });
    const tabset = view.document.createElement("div");
    tabset.dataset.dashfoo = "tabset";
    tabset.getBoundingClientRect = () => new DOMRect(250, 150, 240, 160);
    view.document.body.append(tabset);

    expect(measureFloatRect(tabset)).toEqual({ height: 160, left: 60, top: 40, width: 240 });
  });
});

import { describe, expect, test } from "vitest";

import type { DragSubject, MeasuredLayout, MeasuredTabset } from "./drop-intent";
import { dropIndicator, resolveDropIntent } from "./drop-intent";
import type { Rect } from "./geometry";

const TABSET_RECT: Rect = { height: 300, width: 400, x: 0, y: 0 };
const STRIP: Rect = { height: 30, width: 400, x: 0, y: 0 };

const tabAt = (id: string, x: number) => ({ id, rect: { height: 30, width: 60, x, y: 0 } });

const tabset = (tabIds: ReadonlyArray<string>, direction?: "rtl"): MeasuredTabset => ({
  direction,
  id: "ts1",
  rect: TABSET_RECT,
  strip: { rect: STRIP, tabs: tabIds.map((tabId, index) => tabAt(tabId, index * 60)) },
});

/** Tabs laid out from the strip's right edge, the way a right-to-left strip paints them. */
const rtlTabset = (tabIds: ReadonlyArray<string>): MeasuredTabset => ({
  direction: "rtl",
  id: "ts1",
  rect: TABSET_RECT,
  strip: { rect: STRIP, tabs: tabIds.map((tabId, index) => tabAt(tabId, 340 - index * 60)) },
});

const layout = (tabsetCount = 2): MeasuredLayout => ({
  id: "root",
  rect: { height: 600, width: 800, x: 0, y: 0 },
  tabsetCount,
});

const tab = (id: string): DragSubject => ({ documentId: "doc", id, kind: "tab" });
const tabsetSubject = (id: string): DragSubject => ({ documentId: "doc", id, kind: "tabset" });

describe("resolveDropIntent: layout edges", () => {
  test("a pointer at the layout's edge targets the layout root", () => {
    expect(
      resolveDropIntent(tab("a"), tabset(["a", "b"]), { x: 4, y: 150 }, { edges: layout() }),
    ).toEqual({ location: "split-left", targetId: "root" });
  });

  test("edges are off unless the layout is measured", () => {
    expect(resolveDropIntent(tab("x"), tabset(["a"]), { x: 4, y: 150 })).toEqual({
      location: "split-left",
      targetId: "ts1",
    });
  });

  test("edges stay off when split docking is off", () => {
    expect(
      resolveDropIntent(
        tab("x"),
        tabset(["a"]),
        { x: 4, y: 150 },
        { edges: layout(), splitDock: false },
      ),
    ).toEqual({ index: 1, location: "center", targetId: "ts1" });
  });

  test("a tabset can reach the edge from over itself", () => {
    expect(
      resolveDropIntent(tabsetSubject("ts1"), tabset(["a"]), { x: 4, y: 150 }, { edges: layout() }),
    ).toEqual({ location: "split-left", targetId: "root" });
  });

  test("the only tabset docking at its own edge resolves to nothing", () => {
    const options = { edges: layout(1) };

    expect(
      resolveDropIntent(tabsetSubject("ts1"), tabset(["a"]), { x: 4, y: 150 }, options),
    ).toBeNull();
    expect(resolveDropIntent(tab("a"), tabset(["a"]), { x: 4, y: 150 }, options)).toBeNull();
  });

  test("the edge indicator previews a quarter of the layout", () => {
    const options = { edges: layout() };
    const target = tabset(["a"]);
    const intent = resolveDropIntent(tab("x"), target, { x: 4, y: 150 }, options);

    expect(intent && dropIndicator(tab("x"), target, intent, options)).toEqual({
      kind: "edge",
      rect: { height: 600, width: 200, x: 0, y: 0 },
    });
  });
});

describe("resolveDropIntent: right-to-left", () => {
  test("the insertion index counts from the right", () => {
    const target = rtlTabset(["a", "b", "c"]);

    expect(resolveDropIntent(tab("x"), target, { x: 390, y: 15 })).toMatchObject({ index: 0 });
    expect(resolveDropIntent(tab("x"), target, { x: 330, y: 15 })).toMatchObject({ index: 1 });
    expect(resolveDropIntent(tab("x"), target, { x: 10, y: 15 })).toMatchObject({ index: 3 });
  });

  test("the insertion line sits on the leading (right) edge of the slot", () => {
    const target = rtlTabset(["a", "b"]);
    const intent = resolveDropIntent(tab("x"), target, { x: 330, y: 15 });

    expect(intent && dropIndicator(tab("x"), target, intent).rect.x).toBe(338);
  });

  test("the screen-left edge of a tabset docks after it in row order", () => {
    const target = tabset(["a"], "rtl");
    const intent = resolveDropIntent(tab("x"), target, { x: 10, y: 150 });

    expect(intent).toEqual({ location: "split-right", targetId: "ts1" });
    expect(intent && dropIndicator(tab("x"), target, intent).rect.x).toBe(0);
  });

  test("the screen-left layout edge docks after everything in row order", () => {
    const options = { edges: layout() };
    const target = tabset(["a"], "rtl");
    const intent = resolveDropIntent(tab("x"), target, { x: 4, y: 150 }, options);

    expect(intent).toEqual({ location: "split-right", targetId: "root" });
    expect(intent && dropIndicator(tab("x"), target, intent, options).rect.x).toBe(0);
  });
});

import { describe, expect, test } from "vitest";

import type { DragSubject } from "../machines/drag-dock-machine";

import type { MeasuredTabset } from "./drop-intent";
import { dropIndicator, resolveDropIntent } from "./drop-intent";
import type { Rect } from "./geometry";

const STRIP: Rect = { height: 30, width: 400, x: 0, y: 0 };
const TABSET_RECT: Rect = { height: 300, width: 400, x: 0, y: 0 };

const tabAt = (id: string, x: number) => ({ id, rect: { height: 30, width: 60, x, y: 0 } });

const tabset = (tabIds: ReadonlyArray<string>, id = "ts1"): MeasuredTabset => ({
  id,
  rect: TABSET_RECT,
  strip: { rect: STRIP, tabs: tabIds.map((tabId, index) => tabAt(tabId, index * 60)) },
});

const stripless = (id = "ts1"): MeasuredTabset => ({ id, rect: TABSET_RECT, strip: null });

const tab = (id: string): DragSubject => ({ documentId: "doc", id, kind: "tab" });
const tabsetSubject = (id: string): DragSubject => ({ documentId: "doc", id, kind: "tabset" });

const external: DragSubject = {
  id: "external-1",
  kind: "external",
  tab: { component: "chart", id: "new", name: "New", type: "tab" },
};

const BODY_CENTER = { x: 200, y: 165 };
const BODY_LEFT_EDGE = { x: 10, y: 165 };

describe("resolveDropIntent: self-drops", () => {
  test("a tabset dragged onto itself resolves to nothing", () => {
    const target = tabset(["a", "b"]);
    expect(resolveDropIntent(tabsetSubject("ts1"), target, BODY_CENTER)).toBeNull();
    expect(resolveDropIntent(tabsetSubject("ts1"), target, { x: 10, y: 15 })).toBeNull();
    expect(resolveDropIntent(tabsetSubject("ts1"), target, BODY_LEFT_EDGE)).toBeNull();
  });

  test("a tabset dragged onto another tabset resolves", () => {
    expect(resolveDropIntent(tabsetSubject("ts2"), tabset(["a"]), BODY_LEFT_EDGE)).toEqual({
      location: "split-left",
      targetId: "ts1",
    });
  });

  test("the sole tab dropped back onto its own tabset resolves to nothing", () => {
    const target = tabset(["only"]);
    expect(resolveDropIntent(tab("only"), target, { x: 30, y: 15 })).toBeNull();
    expect(resolveDropIntent(tab("only"), target, BODY_LEFT_EDGE)).toBeNull();
  });

  test("a sole tab onto a different tabset resolves", () => {
    expect(resolveDropIntent(tab("only"), tabset(["other"]), BODY_CENTER)).toEqual({
      index: 1,
      location: "center",
      targetId: "ts1",
    });
  });

  test("one of several tabs onto its own tabset resolves to a reorder or split", () => {
    const target = tabset(["a", "b"]);
    expect(resolveDropIntent(tab("a"), target, { x: 200, y: 15 })).toEqual({
      index: 1,
      location: "center",
      targetId: "ts1",
    });
    expect(resolveDropIntent(tab("a"), target, BODY_LEFT_EDGE)).toEqual({
      location: "split-left",
      targetId: "ts1",
    });
  });

  test("an external tab is never a self-drop", () => {
    expect(resolveDropIntent(external, tabset(["external-1"]), BODY_CENTER)).toEqual({
      index: 1,
      location: "center",
      targetId: "ts1",
    });
  });
});

describe("resolveDropIntent: strip vs body", () => {
  test("over the strip, the drop stacks at the insertion index even near an edge", () => {
    expect(resolveDropIntent(tab("x"), tabset(["a", "b"]), { x: 2, y: 2 })).toEqual({
      index: 0,
      location: "center",
      targetId: "ts1",
    });
  });

  test("over the body center, the drop appends past the remaining tabs", () => {
    expect(resolveDropIntent(tab("a"), tabset(["a", "b", "c"]), BODY_CENTER)).toEqual({
      index: 2,
      location: "center",
      targetId: "ts1",
    });
  });

  test("over the body edge band, the drop splits toward the closest edge", () => {
    expect(resolveDropIntent(tab("x"), tabset(["a"]), { x: 200, y: 295 })).toEqual({
      location: "split-bottom",
      targetId: "ts1",
    });
  });
});

describe("resolveDropIntent: insertion index at each gap", () => {
  const target = tabset(["a", "b", "c"]);

  const atX = (x: number): number | undefined =>
    resolveDropIntent(tab("x"), target, { x, y: 15 })?.index;

  test("left of the first midpoint inserts at 0", () => {
    expect(atX(5)).toBe(0);
  });

  test("between the first and second midpoints inserts at 1", () => {
    expect(atX(45)).toBe(1);
  });

  test("between the second and third midpoints inserts at 2", () => {
    expect(atX(100)).toBe(2);
  });

  test("past every midpoint inserts at the end", () => {
    expect(atX(390)).toBe(3);
  });

  test("the dragged tab's own slot does not count", () => {
    expect(resolveDropIntent(tab("a"), target, { x: 100, y: 15 })?.index).toBe(1);
    expect(resolveDropIntent(tab("a"), target, { x: 390, y: 15 })?.index).toBe(2);
  });

  test("an empty strip inserts at 0", () => {
    expect(resolveDropIntent(tab("x"), tabset([]), { x: 50, y: 15 })?.index).toBe(0);
  });
});

describe("resolveDropIntent: splitDock off", () => {
  test("an edge drop over the body stacks at the end instead of splitting", () => {
    expect(
      resolveDropIntent(tab("x"), tabset(["a", "b"]), BODY_LEFT_EDGE, { splitDock: false }),
    ).toEqual({ index: 2, location: "center", targetId: "ts1" });
  });

  test("strip drops keep their insertion index", () => {
    expect(
      resolveDropIntent(tab("x"), tabset(["a", "b"]), { x: 5, y: 15 }, { splitDock: false }),
    ).toEqual({ index: 0, location: "center", targetId: "ts1" });
  });
});

describe("resolveDropIntent: missing strip", () => {
  test("a body center drop stacks with no index", () => {
    expect(resolveDropIntent(tab("x"), stripless(), BODY_CENTER)).toEqual({
      location: "center",
      targetId: "ts1",
    });
  });

  test("an edge drop still splits", () => {
    expect(resolveDropIntent(tab("x"), stripless(), BODY_LEFT_EDGE)).toEqual({
      location: "split-left",
      targetId: "ts1",
    });
  });

  test("a tabset onto itself is still a self-drop", () => {
    expect(resolveDropIntent(tabsetSubject("ts1"), stripless(), BODY_CENTER)).toBeNull();
  });
});

describe("dropIndicator", () => {
  test("marks the slot the resolved index names, past the dragged tab's slot", () => {
    const target = tabset(["a", "b", "c"]);
    const point = { x: 100, y: 15 };
    const intent = resolveDropIntent(tab("a"), target, point);
    expect(intent?.index).toBe(1);
    expect(dropIndicator(tab("a"), target, intent!)).toEqual({
      kind: "insertion",
      rect: { height: 30, width: 4, x: 118, y: 0 },
    });
  });

  test("at the end, the line sits past the last tab", () => {
    expect(
      dropIndicator(tab("x"), tabset(["a", "b"]), {
        index: 2,
        location: "center",
        targetId: "ts1",
      }),
    ).toEqual({ kind: "insertion", rect: { height: 30, width: 4, x: 118, y: 0 } });
  });

  test("an empty strip rests the line at the strip start", () => {
    expect(
      dropIndicator(tab("x"), tabset([]), { index: 0, location: "center", targetId: "ts1" }),
    ).toEqual({ kind: "insertion", rect: { height: 30, width: 4, x: 0, y: 0 } });
  });

  test("the line is clamped inside the strip's right edge", () => {
    const target: MeasuredTabset = {
      id: "ts1",
      rect: TABSET_RECT,
      strip: { rect: STRIP, tabs: [tabAt("a", 340)] },
    };

    expect(
      dropIndicator(tab("x"), target, { index: 1, location: "center", targetId: "ts1" }),
    ).toEqual({ kind: "insertion", rect: { height: 30, width: 4, x: 396, y: 0 } });
  });

  test("a split paints the matching half of the tabset", () => {
    expect(
      dropIndicator(tab("x"), tabset(["a"]), { location: "split-left", targetId: "ts1" }),
    ).toEqual({ kind: "zone", rect: { height: 300, width: 200, x: 0, y: 0 } });
  });

  test("a center drop onto a stripless tabset paints the whole tabset", () => {
    expect(dropIndicator(tab("x"), stripless(), { location: "center", targetId: "ts1" })).toEqual({
      kind: "zone",
      rect: TABSET_RECT,
    });
  });
});

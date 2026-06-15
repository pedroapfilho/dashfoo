import { describe, expect, test } from "vitest";

import type { Dashfoo, TabNode, TabsetNode } from "../model/schema";

import { reducer } from "./reducer";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const baseModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: { tabLocation: "top" },
  layout: {
    children: [
      { children: [tab("t1"), tab("t2")], id: "ts1", selected: 0, type: "tabset", weight: 60 },
      { children: [tab("t3")], id: "ts2", selected: 0, type: "tabset", weight: 40 },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const tabsetById = (model: Dashfoo, id: string): TabsetNode | undefined =>
  model.layout.children.find((c): c is TabsetNode => c.type === "tabset" && c.id === id);

describe("reducer", () => {
  test("selectTab sets the tabset's selected index", () => {
    const next = reducer(baseModel(), { index: 1, tabsetId: "ts1", type: "selectTab" });

    expect(tabsetById(next, "ts1")?.selected).toBe(1);
  });

  test("selectTab clamps an out-of-range index via normalize", () => {
    const next = reducer(baseModel(), { index: 9, tabsetId: "ts1", type: "selectTab" });

    expect(tabsetById(next, "ts1")?.selected).toBe(1);
  });

  test("setActiveTabset updates activeTabsetId", () => {
    const next = reducer(baseModel(), { tabsetId: "ts2", type: "setActiveTabset" });

    expect(next.activeTabsetId).toBe("ts2");
  });

  test("setActiveTabset ignores an unknown tabset (normalize keeps a valid active)", () => {
    const next = reducer(baseModel(), { tabsetId: "ghost", type: "setActiveTabset" });

    expect(next.activeTabsetId).toBe("ts1");
  });

  test("setMaximizedTabset maximizes and restores", () => {
    const maximized = reducer(baseModel(), { tabsetId: "ts2", type: "setMaximizedTabset" });
    expect(maximized.maximizedTabsetId).toBe("ts2");

    const restored = reducer(maximized, { tabsetId: null, type: "setMaximizedTabset" });
    expect(restored.maximizedTabsetId).toBeUndefined();
  });

  test("renameTab changes a tab's name", () => {
    const next = reducer(baseModel(), { name: "Renamed", tabId: "t2", type: "renameTab" });

    expect(tabsetById(next, "ts1")?.children[1]?.name).toBe("Renamed");
  });

  test("deleteTab removes a tab", () => {
    const next = reducer(baseModel(), { tabId: "t1", type: "deleteTab" });

    expect(tabsetById(next, "ts1")?.children.map((t) => t.id)).toEqual(["t2"]);
  });

  test("deleteTab removing the last tab drops the now-empty tabset", () => {
    const next = reducer(baseModel(), { tabId: "t3", type: "deleteTab" });

    expect(next.layout.children.map((c) => c.id)).toEqual(["ts1"]);
  });

  test("deleteTabset removes the whole tabset", () => {
    const next = reducer(baseModel(), { tabsetId: "ts2", type: "deleteTabset" });

    expect(next.layout.children.map((c) => c.id)).toEqual(["ts1"]);
  });

  test("adjustSplit sets a row's child weights", () => {
    const next = reducer(baseModel(), { rowId: "root", type: "adjustSplit", weights: [70, 30] });

    expect(next.layout.children.map((c) => c.weight)).toEqual([70, 30]);
  });

  test("adjustSplit ignores extra weights past the row's child count", () => {
    // root has 2 children; the third weight has no child to land on, so the loop
    // hits its skip-on-missing-child branch and the extra weight is dropped.
    const next = reducer(baseModel(), {
      rowId: "root",
      type: "adjustSplit",
      weights: [70, 30, 99],
    });

    expect(next.layout.children).toHaveLength(2);
    expect(next.layout.children.map((c) => c.weight)).toEqual([70, 30]);
  });

  test("updateNodeAttributes merges attributes into a tabset", () => {
    const next = reducer(baseModel(), {
      attrs: { weight: 80 },
      nodeId: "ts1",
      type: "updateNodeAttributes",
    });

    expect(tabsetById(next, "ts1")?.weight).toBe(80);
  });

  test("updateGlobalAttributes merges global options", () => {
    const next = reducer(baseModel(), {
      attrs: { tabEnableClose: true },
      type: "updateGlobalAttributes",
    });

    expect(next.global.tabEnableClose).toBe(true);
    expect(next.global.tabLocation).toBe("top");
  });

  test("does not mutate the input model", () => {
    const input = baseModel();
    reducer(input, { name: "X", tabId: "t1", type: "renameTab" });

    expect(tabsetById(input, "ts1")?.children[0]?.name).toBe("t1");
  });
});

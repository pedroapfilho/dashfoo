import { describe, expect, test } from "vitest";

import type { Dashfoo, TabNode, TabsetNode } from "../model/schema";

import { actionSchema } from "./actions";
import { reducer } from "./reducer";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const baseModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
  global: { tabLocation: "top" },
  layout: {
    children: [
      { children: [tab("t1"), tab("t2")], id: "ts1", selected: 0, type: "tabset", weight: 60 },
      { children: [tab("t3")], id: "ts2", selected: 0, type: "tabset", weight: 40 },
    ],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
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

  test("selectTab clamps an out-of-range index", () => {
    const next = reducer(baseModel(), { index: 9, tabsetId: "ts1", type: "selectTab" });

    expect(tabsetById(next, "ts1")?.selected).toBe(1);
  });

  test("deleteTab pulls a selected trailing tab back into range", () => {
    const selectedLast = reducer(baseModel(), { index: 1, tabsetId: "ts1", type: "selectTab" });

    const next = reducer(selectedLast, { tabId: "t2", type: "deleteTab" });

    expect(tabsetById(next, "ts1")?.children.map((t) => t.id)).toEqual(["t1"]);
    expect(tabsetById(next, "ts1")?.selected).toBe(0);
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

  test("updateNodeAttributes selects a tab through the tabset's own attributes", () => {
    const next = reducer(baseModel(), {
      attrs: { selected: 1 },
      nodeId: "ts1",
      type: "updateNodeAttributes",
    });

    expect(tabsetById(next, "ts1")?.selected).toBe(1);
  });

  test("updateNodeAttributes drops attributes that belong to another node kind", () => {
    const next = reducer(baseModel(), {
      attrs: { orientation: "column", weight: 80 },
      nodeId: "ts1",
      type: "updateNodeAttributes",
    });

    const tabset = tabsetById(next, "ts1");
    expect(tabset?.weight).toBe(80);
    expect(tabset).not.toHaveProperty("orientation");
  });

  test("updateNodeAttributes survives the documented actionSchema round trip", () => {
    const parsed = actionSchema.parse({
      attrs: { selected: 2, weight: 30 },
      nodeId: "ts1",
      type: "updateNodeAttributes",
    });

    expect(parsed).toStrictEqual({
      attrs: { selected: 2, weight: 30 },
      nodeId: "ts1",
      type: "updateNodeAttributes",
    });

    const next = reducer(baseModel(), parsed);
    expect(tabsetById(next, "ts1")?.weight).toBe(30);
    expect(tabsetById(next, "ts1")?.selected).toBe(1);
  });

  test("an attrs payload without a weight leaves the tabset's weight alone", () => {
    const parsed = actionSchema.parse({
      attrs: { selected: 1 },
      nodeId: "ts1",
      type: "updateNodeAttributes",
    });

    expect(parsed).toStrictEqual({
      attrs: { selected: 1 },
      nodeId: "ts1",
      type: "updateNodeAttributes",
    });

    expect(tabsetById(reducer(baseModel(), parsed), "ts1")?.weight).toBe(60);
  });

  test("updateGlobalAttributes merges global options", () => {
    const next = reducer(baseModel(), {
      attrs: { tabEnableClose: true },
      type: "updateGlobalAttributes",
    });

    expect(next.global.tabEnableClose).toBe(true);
    expect(next.global.tabLocation).toBe("top");
  });

  test("updateGlobalAttributes sets a global snap config", () => {
    const next = reducer(baseModel(), {
      attrs: { snap: { step: 25, threshold: 5 } },
      type: "updateGlobalAttributes",
    });

    expect(next.global.snap).toEqual({ step: 25, threshold: 5 });
  });

  test("updateNodeAttributes sets a per-row snap config that survives normalize", () => {
    const next = reducer(baseModel(), {
      attrs: { snap: { step: 50 } },
      nodeId: "root",
      type: "updateNodeAttributes",
    });

    expect(next.layout.snap).toEqual({ step: 50 });
    expect(next.layout.children).toHaveLength(2);
  });

  test("does not mutate the input model", () => {
    const input = baseModel();
    reducer(input, { name: "X", tabId: "t1", type: "renameTab" });

    expect(tabsetById(input, "ts1")?.children[0]?.name).toBe("t1");
  });
});

describe("reducer rejects an action rather than losing the node", () => {
  test("moveNode keeps the tab when the target does not resolve", () => {
    const input = baseModel();
    const next = reducer(input, {
      location: "center",
      sourceId: "t1",
      targetId: "ghost",
      type: "moveNode",
    });

    expect(next).toBe(input);
    expect(tabsetById(next, "ts1")?.children.map((child) => child.id)).toEqual(["t1", "t2"]);
  });

  test("moveNode keeps the tab when a split target does not resolve", () => {
    const input = baseModel();
    const next = reducer(input, {
      location: "split-right",
      sourceId: "t1",
      targetId: "ghost",
      type: "moveNode",
    });

    expect(next).toBe(input);
  });

  test("moveTabset keeps the tabset when a split target does not resolve", () => {
    const input = baseModel();
    const next = reducer(input, {
      location: "split-right",
      sourceId: "ts1",
      targetId: "ghost",
      type: "moveTabset",
    });

    expect(next).toBe(input);
    expect(tabsetById(next, "ts1")?.children).toHaveLength(2);
  });

  test("moveTabset keeps the tabset when a center target does not resolve", () => {
    const input = baseModel();

    expect(
      reducer(input, {
        location: "center",
        sourceId: "ts1",
        targetId: "ghost",
        type: "moveTabset",
      }),
    ).toBe(input);
  });
});

describe("reducer reports no change by identity", () => {
  test("selecting the already-selected tab returns the same model", () => {
    const input = baseModel();

    expect(reducer(input, { index: 0, tabsetId: "ts1", type: "selectTab" })).toBe(input);
  });

  test("clamping to the already-selected index returns the same model", () => {
    const selected = reducer(baseModel(), { index: 1, tabsetId: "ts1", type: "selectTab" });

    expect(reducer(selected, { index: 9, tabsetId: "ts1", type: "selectTab" })).toBe(selected);
  });

  test("moveTabset onto itself returns the same model", () => {
    const input = baseModel();

    expect(
      reducer(input, { location: "center", sourceId: "ts1", targetId: "ts1", type: "moveTabset" }),
    ).toBe(input);
  });

  test("an unknown id returns the same model", () => {
    const input = baseModel();

    expect(reducer(input, { tabId: "ghost", type: "deleteTab" })).toBe(input);
    expect(reducer(input, { name: "x", tabId: "ghost", type: "renameTab" })).toBe(input);
    expect(reducer(input, { tabsetId: "ghost", type: "deleteTabset" })).toBe(input);
    expect(reducer(input, { tabsetId: "ghost", type: "setActiveTabset" })).toBe(input);
  });

  test("re-setting an identical attribute returns the same model", () => {
    const input = baseModel();

    expect(reducer(input, { attrs: { tabLocation: "top" }, type: "updateGlobalAttributes" })).toBe(
      input,
    );
    expect(reducer(input, { tabsetId: "ts1", type: "setActiveTabset" })).toBe(input);
    expect(reducer(input, { tabsetId: null, type: "setMaximizedTabset" })).toBe(input);
  });

  test("adjustSplit with the current weights returns the same model", () => {
    const input = baseModel();

    expect(reducer(input, { rowId: "root", type: "adjustSplit", weights: [60, 40] })).toBe(input);
  });

  test("a real edit still returns a new model", () => {
    const input = baseModel();

    expect(reducer(input, { index: 1, tabsetId: "ts1", type: "selectTab" })).not.toBe(input);
  });
});

import { describe, expect, test } from "vitest";

import type { Dashfoo, RowNode, TabNode, TabsetNode } from "../model/schema";
import { findTab } from "../model/tree";

import { reducer } from "./reducer";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const baseModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
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

// A split gives the new tabset a generated id; grab it by exclusion so the
// weight/ordering assertions don't depend on the random id.
const splitModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
  layout: {
    children: [
      { children: [tab("t1")], id: "ts1", selected: 0, type: "tabset", weight: 100 },
      { children: [tab("t3")], id: "ts2", selected: 0, type: "tabset", weight: 40 },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const newTabsetIn = (row: RowNode, knownIds: ReadonlyArray<string>): TabsetNode | undefined =>
  row.children.find((c): c is TabsetNode => c.type === "tabset" && !knownIds.includes(c.id));

describe("addNode", () => {
  test("center adds the tab to the target tabset and selects it", () => {
    const next = reducer(baseModel(), {
      location: "center",
      tab: tab("new"),
      targetId: "ts1",
      type: "addNode",
    });

    const ts1 = tabsetById(next, "ts1");
    expect(ts1?.children.map((t) => t.id)).toEqual(["t1", "t2", "new"]);
    expect(ts1?.selected).toBe(2);
  });

  test("split-right of a tabset whose parent is already a row inserts a sibling tabset", () => {
    const next = reducer(baseModel(), {
      location: "split-right",
      tab: tab("new"),
      targetId: "ts2",
      type: "addNode",
    });

    expect(next.layout.children).toHaveLength(3);
    const last = next.layout.children[2];
    expect(last?.type).toBe("tabset");
    expect((last as TabsetNode).children[0]?.id).toBe("new");
  });

  test("split-bottom wraps the target in a new column row", () => {
    const next = reducer(baseModel(), {
      location: "split-bottom",
      tab: tab("new"),
      targetId: "ts1",
      type: "addNode",
    });

    const wrapped = next.layout.children[0];
    expect(wrapped?.type).toBe("row");
    expect((wrapped as RowNode).orientation).toBe("column");
    expect((wrapped as RowNode).children.map((c) => c.id)).toContain("ts1");
  });
});

describe("moveNode", () => {
  test("moves a tab into another tabset, dropping the now-empty source tabset", () => {
    const next = reducer(baseModel(), {
      location: "center",
      sourceId: "t3",
      targetId: "ts1",
      type: "moveNode",
    });

    expect(findTab(next, "t3")?.container.id).toBe("ts1");
    expect(next.layout.children.map((c) => c.id)).toEqual(["ts1"]);
  });

  test("reorders a tab to the end of its own tabset (index excludes the tab itself)", () => {
    // ts1 is [t1, t2]; moving t1 to the end means dropping it after the one tab
    // that remains, so the post-removal index is 1, not 2.
    const next = reducer(baseModel(), {
      index: 1,
      location: "center",
      sourceId: "t1",
      targetId: "ts1",
      type: "moveNode",
    });

    expect(tabsetById(next, "ts1")?.children.map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  test("reorders a tab to the front of its own tabset", () => {
    const next = reducer(baseModel(), {
      index: 0,
      location: "center",
      sourceId: "t2",
      targetId: "ts1",
      type: "moveNode",
    });

    expect(tabsetById(next, "ts1")?.children.map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  test("splitting moves the tab into a new tabset beside the target", () => {
    const next = reducer(baseModel(), {
      location: "split-right",
      sourceId: "t1",
      targetId: "ts2",
      type: "moveNode",
    });

    expect(findTab(next, "t1")?.container.id).not.toBe("ts1");
    expect(tabsetById(next, "ts1")?.children.map((t) => t.id)).toEqual(["t2"]);
  });
});

describe("moveTabset", () => {
  test("center merges the source tabset's tabs into the target and drops the source", () => {
    const next = reducer(baseModel(), {
      location: "center",
      sourceId: "ts2",
      targetId: "ts1",
      type: "moveTabset",
    });

    expect(tabsetById(next, "ts1")?.children.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    expect(next.layout.children.map((c) => c.id)).toEqual(["ts1"]);
  });

  test("split-right moves the whole tabset beside the target", () => {
    const next = reducer(baseModel(), {
      location: "split-right",
      sourceId: "ts1",
      targetId: "ts2",
      type: "moveTabset",
    });

    expect(findTab(next, "t1")?.container.id).toBe("ts1");
    expect(tabsetById(next, "ts1")?.children.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(tabsetById(next, "ts2")?.children.map((t) => t.id)).toEqual(["t3"]);
  });

  test("same source and target is a no-op", () => {
    const next = reducer(baseModel(), {
      location: "center",
      sourceId: "ts1",
      targetId: "ts1",
      type: "moveTabset",
    });

    expect(next.layout.children.map((c) => c.id)).toEqual(["ts1", "ts2"]);
  });
});

describe("split weight geometry", () => {
  test("a split into a matching-orientation row halves the target's weight", () => {
    // root is a row; split-right matches it, so the parent row is reused and the
    // target's weight (100) is split evenly between target and the new tabset.
    const next = reducer(splitModel(), {
      location: "split-right",
      tab: tab("new"),
      targetId: "ts1",
      type: "addNode",
    });

    expect(tabsetById(next, "ts1")?.weight).toBe(50);
    expect(newTabsetIn(next.layout, ["ts1", "ts2"])?.weight).toBe(50);
  });

  test("a wrapping split sets both halves to 50 and gives the new row the target's weight", () => {
    // split-bottom is the opposite orientation of the root row, so the target is
    // wrapped in a new column row that inherits the target's original weight (100)
    // while both tabsets inside it reset to 50.
    const next = reducer(splitModel(), {
      location: "split-bottom",
      tab: tab("new"),
      targetId: "ts1",
      type: "addNode",
    });

    const wrap = next.layout.children[0];
    expect(wrap?.type).toBe("row");
    expect((wrap as RowNode).orientation).toBe("column");
    expect((wrap as RowNode).weight).toBe(100);

    const wrapRow = wrap as RowNode;
    const wrapped = wrapRow.children.find(
      (c): c is TabsetNode => c.type === "tabset" && c.id === "ts1",
    );
    expect(wrapped?.weight).toBe(50);
    expect(newTabsetIn(wrapRow, ["ts1"])?.weight).toBe(50);
  });

  test("split-left places the new tabset before the target", () => {
    const next = reducer(splitModel(), {
      location: "split-left",
      tab: tab("L"),
      targetId: "ts1",
      type: "addNode",
    });

    // matching orientation reuses the root row; the new tabset lands at index 0.
    const first = next.layout.children[0];
    expect(first?.type).toBe("tabset");
    expect((first as TabsetNode).children[0]?.id).toBe("L");
    expect(next.layout.children[1]?.id).toBe("ts1");
  });

  test("split-right places the new tabset after the target", () => {
    const next = reducer(splitModel(), {
      location: "split-right",
      tab: tab("R"),
      targetId: "ts1",
      type: "addNode",
    });

    expect(next.layout.children[0]?.id).toBe("ts1");
    const second = next.layout.children[1];
    expect(second?.type).toBe("tabset");
    expect((second as TabsetNode).children[0]?.id).toBe("R");
  });

  test("split-top wraps and places the new tabset before the target", () => {
    const next = reducer(splitModel(), {
      location: "split-top",
      tab: tab("T"),
      targetId: "ts1",
      type: "addNode",
    });

    const wrap = next.layout.children[0] as RowNode;
    expect(wrap.children.map((c) => (c as TabsetNode).children[0]?.id)).toEqual(["T", "t1"]);
  });

  test("split-bottom wraps and places the new tabset after the target", () => {
    const next = reducer(splitModel(), {
      location: "split-bottom",
      tab: tab("Bo"),
      targetId: "ts1",
      type: "addNode",
    });

    const wrap = next.layout.children[0] as RowNode;
    expect(wrap.children.map((c) => (c as TabsetNode).children[0]?.id)).toEqual(["t1", "Bo"]);
  });

  test("moveTabset split into a matching-orientation row halves the target's weight", () => {
    // ts2 (weight 40) is detached and placed beside ts1 (weight 100) in the reused
    // root row, so ts1 and the moved ts2 each end up at 50.
    const next = reducer(splitModel(), {
      location: "split-right",
      sourceId: "ts2",
      targetId: "ts1",
      type: "moveTabset",
    });

    expect(tabsetById(next, "ts1")?.weight).toBe(50);
    expect(tabsetById(next, "ts2")?.weight).toBe(50);
    expect(next.layout.children.map((c) => c.id)).toEqual(["ts1", "ts2"]);
  });
});

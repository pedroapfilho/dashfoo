import { describe, expect, test } from "vitest";

import { reducer } from "./reducer";
import type { Dashfoo, RowNode, TabNode, TabsetNode } from "./schema";
import { findTab } from "./tree";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const baseModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  borders: [],
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

  test("border-left creates a left border holding the tab", () => {
    const next = reducer(baseModel(), {
      location: "border-left",
      tab: tab("nav"),
      targetId: "ts1",
      type: "addNode",
    });

    expect(next.borders.find((b) => b.edge === "left")?.children.map((t) => t.id)).toEqual(["nav"]);
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

  test("reorders a tab within its own tabset", () => {
    const next = reducer(baseModel(), {
      index: 2,
      location: "center",
      sourceId: "t1",
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

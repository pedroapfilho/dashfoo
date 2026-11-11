import { describe, expect, test } from "vitest";

import type { Dashfoo, RowNode, TabNode, TabsetNode } from "../model/schema";

import { reducer } from "./reducer";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const tabsetNode = (id: string, tabIds: ReadonlyArray<string>, weight = 1): TabsetNode => ({
  children: tabIds.map(tab),
  id,
  selected: 0,
  type: "tabset",
  weight,
});

const rowModel = (orientation: RowNode["orientation"] = "row"): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
  global: {},
  layout: {
    children: [tabsetNode("ts1", ["t1", "t2"]), tabsetNode("ts2", ["t3"])],
    id: "root",
    orientation,
    type: "row",
    weight: 1,
  },
  version: 1,
});

const shares = (row: RowNode): Array<number> => {
  const total = row.children.reduce((sum, child) => sum + child.weight, 0);

  return row.children.map((child) => child.weight / total);
};

const childIds = (row: RowNode): Array<string> =>
  row.children.map((child) =>
    child.type === "tabset" ? child.children.map((t) => t.id).join(",") : child.type,
  );

describe("edge docking", () => {
  test("a tab dropped at the layout's left edge becomes a quarter-width sidebar", () => {
    const next = reducer(rowModel(), {
      location: "split-left",
      sourceId: "t2",
      targetId: "root",
      type: "moveNode",
    });

    expect(next.layout.id).toBe("root");
    expect(childIds(next.layout)).toEqual(["t2", "t1", "t3"]);
    expect(shares(next.layout)[0]).toBeCloseTo(0.25);
  });

  test("a tab dropped at the bottom of a row layout wraps it and spans its full width", () => {
    const next = reducer(rowModel(), {
      location: "split-bottom",
      sourceId: "t2",
      targetId: "root",
      type: "moveNode",
    });

    expect(next.layout.id).toBe("root");
    expect(next.layout.orientation).toBe("column");
    expect(childIds(next.layout)).toEqual(["row", "t2"]);
    expect(shares(next.layout)[1]).toBeCloseTo(0.25);

    const [inner] = next.layout.children;
    expect(inner?.type === "row" && inner.orientation).toBe("row");
  });

  test("a whole tabset moves to the edge, keeping its id", () => {
    const next = reducer(rowModel(), {
      location: "split-right",
      sourceId: "ts1",
      targetId: "root",
      type: "moveTabset",
    });

    expect(next.layout.children.map((child) => child.id)).toEqual(["ts2", "ts1"]);
    expect(shares(next.layout)[1]).toBeCloseTo(0.25);
    expect(next.activeTabsetId).toBe("ts1");
  });

  test("a tab whose tabset empties does not count toward the edge share", () => {
    const next = reducer(rowModel(), {
      location: "split-left",
      sourceId: "t3",
      targetId: "root",
      type: "moveNode",
    });

    expect(childIds(next.layout)).toEqual(["t3", "t1,t2"]);
    expect(shares(next.layout)[0]).toBeCloseTo(0.25);
  });

  test("an external tab can be added at an edge", () => {
    const next = reducer(rowModel("column"), {
      location: "split-top",
      tab: tab("new"),
      targetId: "root",
      type: "addNode",
    });

    expect(childIds(next.layout)).toEqual(["new", "t1,t2", "t3"]);
  });

  test("a center drop on the layout itself is ignored and loses nothing", () => {
    const model = rowModel();

    expect(
      reducer(model, { location: "center", sourceId: "t2", targetId: "root", type: "moveNode" }),
    ).toEqual(model);
    expect(
      reducer(model, { location: "center", sourceId: "ts2", targetId: "root", type: "moveTabset" }),
    ).toEqual(model);
  });
});

describe("tabset enableDrag", () => {
  test("is a mutable tabset attribute", () => {
    const next = reducer(rowModel(), {
      attrs: { enableDrag: false },
      nodeId: "ts1",
      type: "updateNodeAttributes",
    });

    expect(next.layout.children[0]).toMatchObject({ enableDrag: false, id: "ts1" });
  });
});

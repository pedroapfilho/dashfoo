import { assert, describe, expect, test, vi } from "vitest";

import type { Dashfoo, TabNode, TabsetNode } from "../model/schema";
import { standaloneModel } from "../model/standalone";
import { collectTabsets, findTab } from "../model/tree";

import { reducer } from "./reducer";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const tabsetOf = (id: string, tabIds: Array<string>): TabsetNode => ({
  children: tabIds.map(tab),
  id,
  selected: 0,
  type: "tabset",
  weight: 1,
});

const baseModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
  global: { tabLocation: "bottom" },
  layout: {
    children: [tabsetOf("ts1", ["t1", "t2"]), tabsetOf("ts2", ["t3"])],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

const tabsetIds = (model: Dashfoo): Array<string> => collectTabsets(model).map(({ id }) => id);

describe("tearOff and transferOut", () => {
  test.each(["tearOff", "transferOut"] as const)("%s removes a tab", (type) => {
    const next = reducer(baseModel(), { nodeId: "t1", type });

    expect(findTab(next, "t1")).toBeUndefined();
    expect(findTab(next, "t2")).toBeDefined();
  });

  test.each(["tearOff", "transferOut"] as const)("%s removes a whole tabset", (type) => {
    expect(tabsetIds(reducer(baseModel(), { nodeId: "ts2", type }))).toEqual(["ts1"]);
  });

  test("an unknown id changes nothing", () => {
    const model = baseModel();

    expect(reducer(model, { nodeId: "missing", type: "tearOff" })).toBe(model);
  });
});

describe("transferIn", () => {
  test("stacks a tab at the index", () => {
    const next = reducer(baseModel(), {
      index: 1,
      location: "center",
      node: tab("x"),
      targetId: "ts1",
      type: "transferIn",
    });

    expect(findTab(next, "x")).toMatchObject({ container: { id: "ts1" }, index: 1 });
    expect(next.activeTabsetId).toBe("ts1");
  });

  test("splits a tab beside the target", () => {
    const next = reducer(baseModel(), {
      location: "split-right",
      node: tab("x"),
      targetId: "ts2",
      type: "transferIn",
    });

    expect(
      collectTabsets(next)
        .at(-1)
        ?.children.map(({ id }) => id),
    ).toEqual(["x"]);
  });

  test("merges a tabset's tabs on a center drop", () => {
    const next = reducer(baseModel(), {
      location: "center",
      node: tabsetOf("other", ["x", "y"]),
      targetId: "ts2",
      type: "transferIn",
    });

    expect(
      collectTabsets(next)
        .find(({ id }) => id === "ts2")
        ?.children.map(({ id }) => id),
    ).toEqual(["t3", "x", "y"]);
  });

  test("places a tabset beside the target, renaming a taken tabset id", () => {
    const next = reducer(baseModel(), {
      location: "split-bottom",
      node: tabsetOf("ts1", ["x"]),
      targetId: "ts2",
      type: "transferIn",
    });

    const placed = collectTabsets(next).find((candidate) => candidate.children[0]?.id === "x");
    assert(placed);
    expect(placed.id).not.toBe("ts1");
    expect(tabsetIds(next)).toContain("ts1");
  });

  test("rejects a node whose tab id is already in the layout", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const model = baseModel();

    expect(
      reducer(model, { location: "center", node: tab("t3"), targetId: "ts1", type: "transferIn" }),
    ).toBe(model);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"t3"'));
    warn.mockRestore();
  });
});

describe("standaloneModel", () => {
  test("wraps a tab in a tabset of its own and keeps the global attributes", () => {
    const detached = standaloneModel(baseModel(), "t2");
    assert(detached);

    expect(collectTabsets(detached).map(({ children }) => children.map(({ id }) => id))).toEqual([
      ["t2"],
    ]);
    expect(detached.global).toEqual({ tabLocation: "bottom" });
  });

  test("keeps a tabset whole, id included", () => {
    expect(tabsetIds(standaloneModel(baseModel(), "ts1") ?? baseModel())).toEqual(["ts1"]);
  });

  test("returns undefined for an unknown id", () => {
    expect(standaloneModel(baseModel(), "missing")).toBeUndefined();
  });
});

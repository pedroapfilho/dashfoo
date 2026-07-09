import { describe, expect, test } from "vitest";

import { reducer } from "../state/reducer";

import type { Dashfoo } from "./schema";
import { stackModel } from "./stack";

const nested = (): Dashfoo => ({
  activeTabsetId: "ts-a",
  global: {},
  layout: {
    children: [
      {
        children: [
          { component: "c", id: "t1", name: "A", type: "tab" },
          { component: "c", id: "t1b", name: "A2", type: "tab" },
        ],
        id: "ts-a",
        selected: 0,
        type: "tabset",
      },
      {
        children: [
          {
            children: [{ component: "c", id: "t2", name: "B", type: "tab" }],
            id: "ts-b",
            selected: 0,
            type: "tabset",
          },
          {
            children: [{ component: "c", id: "t3", name: "C", type: "tab" }],
            id: "ts-c",
            selected: 0,
            type: "tabset",
          },
        ],
        id: "r2",
        orientation: "column",
        type: "row",
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  maximizedTabsetId: "ts-a",
  version: 1,
});

describe("stackModel", () => {
  test("flattens nested rows into one column of tabsets", () => {
    const out = stackModel(nested());
    expect(out.layout.orientation).toBe("column");
    expect(out.layout.children.map((child) => child.type)).toEqual(["tabset", "tabset", "tabset"]);
    expect(out.layout.children.map((child) => child.id)).toEqual(["ts-a", "ts-b", "ts-c"]);
    expect(out.maximizedTabsetId).toBeUndefined();
  });

  test("orientation row stacks horizontally", () => {
    expect(stackModel(nested(), "row").layout.orientation).toBe("row");
  });

  test("a selectTab using a stacked-view tabset id lands on the canonical model", () => {
    const source = nested();
    const stacked = stackModel(source);
    const tabsetId = stacked.layout.children[0].id;
    expect(tabsetId).toBe("ts-a");

    const next = reducer(source, { index: 1, tabsetId, type: "selectTab" });
    const tabset = next.layout.children[0];
    expect(tabset.type === "tabset" && tabset.selected).toBe(1);
  });

  test("leaves floating-panel tabsets out of the stacked main layout", () => {
    const floated = reducer(nested(), { tabsetId: "ts-a", type: "floatTabset" });
    expect(floated.floats).toHaveLength(1);

    const stacked = stackModel(floated);
    expect(stacked.layout.children.map((child) => child.id)).toEqual(["ts-b", "ts-c"]);

    expect(stacked.floats).toHaveLength(1);
    expect(stacked.floats?.[0]?.id).toBe(floated.floats?.[0]?.id);
  });
});

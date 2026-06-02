import { describe, expect, test } from "vitest";

import { dashfooSchema, tabNodeSchema } from "./schema";

const validModel = {
  activeTabsetId: "ts1",
  borders: [
    {
      children: [{ component: "explorer", id: "t4", name: "Explorer", type: "tab" }],
      edge: "left",
      mode: "auto-hide",
      selected: -1,
      size: { unit: "px", value: 240 },
      type: "border",
    },
  ],
  global: { splitterSize: 6, tabEnableClose: true },
  layout: {
    children: [
      {
        children: [
          { component: "chart", config: { symbol: "BTC" }, id: "t1", name: "Chart", type: "tab" },
          { component: "book", id: "t2", name: "Order Book", type: "tab" },
        ],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 60,
      },
      {
        children: [
          {
            children: [{ component: "trades", id: "t3", name: "Trades", type: "tab" }],
            id: "ts2",
            min: { unit: "px", value: 200 },
            selected: 0,
            type: "tabset",
            weight: 40,
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
  version: 1,
};

describe("dashfooSchema", () => {
  test("parses a valid model with nested rows, a tabset, and a border", () => {
    const result = dashfooSchema.parse(validModel);

    expect(result.layout.children).toHaveLength(2);
    expect(result.borders[0]?.edge).toBe("left");
  });

  test("rejects a model missing the version field", () => {
    const { version: _version, ...withoutVersion } = validModel;

    expect(() => dashfooSchema.parse(withoutVersion)).toThrow();
  });

  test("rejects an unknown dimension unit", () => {
    const badUnit = structuredClone(validModel);
    badUnit.borders[0].size = { unit: "parsecs", value: 240 } as never;

    expect(() => dashfooSchema.parse(badUnit)).toThrow();
  });

  test("rejects a row whose orientation is not row or column", () => {
    const badOrientation = structuredClone(validModel);
    badOrientation.layout.orientation = "diagonal" as never;

    expect(() => dashfooSchema.parse(badOrientation)).toThrow();
  });
});

describe("tabNodeSchema", () => {
  test("accepts JSON-serializable config", () => {
    const tab = tabNodeSchema.parse({
      component: "chart",
      config: { nested: { on: true, values: [1, 2, 3] } },
      id: "t1",
      name: "Chart",
      type: "tab",
    });

    expect(tab.component).toBe("chart");
  });

  test("rejects non-serializable config (a function)", () => {
    expect(() =>
      tabNodeSchema.parse({
        component: "chart",
        config: { handler: () => null },
        id: "t1",
        name: "Chart",
        type: "tab",
      }),
    ).toThrow();
  });
});

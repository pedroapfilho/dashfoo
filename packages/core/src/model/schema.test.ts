import { describe, expect, test } from "vitest";

import { dashfooSchema, tabNodeSchema, tabsetNodeSchema } from "./schema";

const validModel = {
  activeTabsetId: "ts1",
  global: { tabEnableClose: true },
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
  test("parses a valid model with nested rows and tabsets", () => {
    const result = dashfooSchema.parse(validModel);

    expect(result.layout.children).toHaveLength(2);
    expect(result.layout.children[0]?.type).toBe("tabset");
  });

  test("rejects a model missing the version field", () => {
    const { version: _version, ...withoutVersion } = validModel;

    expect(() => dashfooSchema.parse(withoutVersion)).toThrow();
  });

  test("global.splitterSize is accepted and preserved", () => {
    const parsed = dashfooSchema.parse({
      ...validModel,
      global: { splitterSize: 6 },
    });
    expect(parsed.global.splitterSize).toBe(6);
  });

  test("global editing flags are accepted and preserved", () => {
    const parsed = dashfooSchema.parse({
      ...validModel,
      global: { enableSplitResize: false, tabEnableDrag: false },
    });
    expect(parsed.global.enableSplitResize).toBe(false);
    expect(parsed.global.tabEnableDrag).toBe(false);
  });

  test("accepts row dimensions and tabSetMinSize", () => {
    const parsed = dashfooSchema.parse({
      ...validModel,
      global: { tabSetMinSize: 120 },
      layout: {
        ...validModel.layout,
        children: [
          {
            children: [{ component: "chart", id: "t1", name: "Chart", type: "tab" }],
            id: "ts1",
            min: { unit: "px", value: 160 },
            selected: 0,
            type: "tabset",
          },
        ],
        max: { unit: "px", value: 900 },
        min: { unit: "px", value: 300 },
      },
    });

    expect(parsed.global.tabSetMinSize).toBe(120);
    expect(parsed.layout.min).toEqual({ unit: "px", value: 300 });
    expect(parsed.layout.children[0]).toMatchObject({
      min: { unit: "px", value: 160 },
    });
  });

  test("rejects an unknown dimension unit", () => {
    const badUnit = structuredClone(validModel);
    // ts2 carries a `min` dimension; corrupt its unit.
    (badUnit.layout.children[1] as { children: Array<{ min: unknown }> }).children[0].min = {
      unit: "parsecs",
      value: 240,
    };

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

describe("tabsetNodeSchema", () => {
  const baseTabset = {
    children: [{ component: "chart", id: "t1", name: "Chart", type: "tab" }],
    id: "ts1",
    selected: 0,
    type: "tabset",
  };

  test("accepts an optional name labelling the tablist", () => {
    const parsed = tabsetNodeSchema.parse({ ...baseTabset, name: "Charts" });
    expect(parsed.name).toBe("Charts");
  });

  test("accepts a tabset without a name", () => {
    const parsed = tabsetNodeSchema.parse(baseTabset);
    expect(parsed.name).toBeUndefined();
  });

  test("accepts min and max sizing fields", () => {
    const parsed = tabsetNodeSchema.parse({
      ...baseTabset,
      max: { unit: "%", value: 90 },
      min: { unit: "px", value: 120 },
    });

    expect(parsed.max).toEqual({ unit: "%", value: 90 });
    expect(parsed.min).toEqual({ unit: "px", value: 120 });
  });
});

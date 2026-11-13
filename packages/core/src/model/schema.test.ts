import { assert, describe, expect, test } from "vitest";
import { ZodError } from "zod";

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

    expect(() => dashfooSchema.parse(withoutVersion)).toThrow(ZodError);
  });

  test("fills in an omitted floats list", () => {
    expect(dashfooSchema.parse(validModel).floats).toEqual([]);
  });

  test("gives each parse its own floats array", () => {
    const first = dashfooSchema.parse(validModel);
    const second = dashfooSchema.parse(validModel);

    first.floats.push({
      geometry: { height: 10, left: 0, top: 0, width: 10 },
      id: "f1",
      layout: { children: [], id: "frow", orientation: "row", type: "row", weight: 1 },
      type: "float",
    });

    expect(second.floats).toEqual([]);
  });

  test("fills in an omitted weight on rows and tabsets", () => {
    const parsed = dashfooSchema.parse(validModel);

    expect(parsed.layout.weight).toBe(1);
    expect(parsed.layout.children[1]?.weight).toBe(1);
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
            weight: 1,
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

    const [badChild] = (badUnit.layout.children[1] as { children: Array<{ min: unknown }> })
      .children;

    assert(badChild);
    badChild.min = { unit: "parsecs", value: 240 };

    expect(() => dashfooSchema.parse(badUnit)).toThrow(ZodError);
  });

  test("rejects a row whose orientation is not row or column", () => {
    const badOrientation = structuredClone(validModel);
    badOrientation.layout.orientation = "diagonal";

    expect(() => dashfooSchema.parse(badOrientation)).toThrow(ZodError);
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
    ).toThrow(ZodError);
  });
});

describe("tabsetNodeSchema", () => {
  const baseTabset = {
    children: [{ component: "chart", id: "t1", name: "Chart", type: "tab" }],
    id: "ts1",
    selected: 0,
    type: "tabset",
    weight: 1,
  };

  test("leaves an out-of-range selected index for normalize to clamp", () => {
    expect(tabsetNodeSchema.parse({ ...baseTabset, selected: 7 }).selected).toBe(7);
    expect(tabsetNodeSchema.parse({ ...baseTabset, selected: -3 }).selected).toBe(-3);
  });

  test("rejects a fractional or NaN selected index", () => {
    expect(tabsetNodeSchema.safeParse({ ...baseTabset, selected: 1.5 }).success).toBe(false);
    expect(tabsetNodeSchema.safeParse({ ...baseTabset, selected: Number.NaN }).success).toBe(false);
  });
});

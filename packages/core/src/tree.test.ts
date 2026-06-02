import { describe, expect, test } from "vitest";

import type { Dashfoo } from "./schema";
import { collectTabsets, findBorder, findTab, findTabset, getFirstTabset } from "./tree";

const model: Dashfoo = {
  borders: [
    {
      children: [{ component: "explorer", id: "bt1", name: "Explorer", type: "tab" }],
      edge: "left",
      selected: -1,
      type: "border",
    },
  ],
  global: {},
  layout: {
    children: [
      {
        children: [
          { component: "chart", id: "t1", name: "Chart", type: "tab" },
          { component: "book", id: "t2", name: "Book", type: "tab" },
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
            selected: 0,
            type: "tabset",
            weight: 40,
          },
        ],
        id: "r2",
        orientation: "column",
        type: "row",
        weight: 40,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
};

describe("collectTabsets", () => {
  test("returns every tabset across nested rows, depth-first, excluding borders", () => {
    expect(collectTabsets(model).map((ts) => ts.id)).toEqual(["ts1", "ts2"]);
  });
});

describe("getFirstTabset", () => {
  test("returns the first tabset in document order", () => {
    expect(getFirstTabset(model)?.id).toBe("ts1");
  });
});

describe("findTabset", () => {
  test("finds a tabset nested inside a row", () => {
    expect(findTabset(model, "ts2")?.id).toBe("ts2");
  });

  test("returns undefined for an unknown id", () => {
    expect(findTabset(model, "nope")).toBeUndefined();
  });
});

describe("findTab", () => {
  test("locates a tab inside a tabset with its container and index", () => {
    const found = findTab(model, "t2");

    expect(found?.container.id).toBe("ts1");
    expect(found?.index).toBe(1);
    expect(found?.tab.name).toBe("Book");
  });

  test("locates a tab inside a border", () => {
    const found = findTab(model, "bt1");

    expect(found?.container.type).toBe("border");
    expect(found?.index).toBe(0);
  });

  test("returns undefined for an unknown tab id", () => {
    expect(findTab(model, "nope")).toBeUndefined();
  });
});

describe("findBorder", () => {
  test("finds a border by edge", () => {
    expect(findBorder(model, "left")?.children).toHaveLength(1);
  });

  test("returns undefined when no border is docked on that edge", () => {
    expect(findBorder(model, "right")).toBeUndefined();
  });
});

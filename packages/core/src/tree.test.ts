import { describe, expect, test } from "vitest";

import type { Dashfoo } from "./schema";
import {
  collectTabsets,
  findAttributedNode,
  findRow,
  findTab,
  findTabset,
  findTabsetParent,
  getFirstTabset,
} from "./tree";

const model: Dashfoo = {
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

// A layout nested two rows deep: root row -> r2 (column) -> r3 (row) holding the
// deeply-nested tabset+tab, exercising the recursive descent in the finders.
const deepModel: Dashfoo = {
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "chart", id: "t1", name: "Chart", type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 50,
      },
      {
        children: [
          {
            children: [
              {
                children: [{ component: "book", id: "t2", name: "Book", type: "tab" }],
                id: "ts2",
                selected: 0,
                type: "tabset",
                weight: 70,
              },
              {
                children: [{ component: "trades", id: "t3", name: "Trades", type: "tab" }],
                id: "ts3",
                selected: 0,
                type: "tabset",
                weight: 30,
              },
            ],
            id: "r3",
            orientation: "row",
            type: "row",
            weight: 100,
          },
        ],
        id: "r2",
        orientation: "column",
        type: "row",
        weight: 50,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
};

describe("collectTabsets", () => {
  test("returns every tabset across nested rows, depth-first", () => {
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

  test("returns undefined for an unknown tab id", () => {
    expect(findTab(model, "nope")).toBeUndefined();
  });
});

describe("findRow", () => {
  test("locates a row nested two levels deep", () => {
    const found = findRow(deepModel.layout, "r3");

    expect(found?.id).toBe("r3");
    expect(found?.orientation).toBe("row");
  });

  test("returns the root when its own id is requested", () => {
    expect(findRow(deepModel.layout, "root")?.id).toBe("root");
  });

  test("returns undefined for an unknown id", () => {
    expect(findRow(deepModel.layout, "nope")).toBeUndefined();
  });
});

describe("findAttributedNode", () => {
  test("locates a row nested two levels deep", () => {
    const found = findAttributedNode(deepModel, "r3");

    expect(found?.type).toBe("row");
    expect(found?.id).toBe("r3");
  });

  test("locates a tabset nested two levels deep", () => {
    const found = findAttributedNode(deepModel, "ts2");

    expect(found?.type).toBe("tabset");
    expect(found?.id).toBe("ts2");
  });

  test("locates a tab nested two levels deep", () => {
    const found = findAttributedNode(deepModel, "t3");

    expect(found?.type).toBe("tab");
    expect(found?.id).toBe("t3");
  });

  test("returns undefined for an unknown id", () => {
    expect(findAttributedNode(deepModel, "nope")).toBeUndefined();
  });
});

describe("findTabsetParent", () => {
  test("returns the parent row and index for a deeply nested tabset", () => {
    const found = findTabsetParent(deepModel.layout, "ts3");

    expect(found?.parent.id).toBe("r3");
    expect(found?.index).toBe(1);
  });

  test("returns undefined for an unknown id", () => {
    expect(findTabsetParent(deepModel.layout, "nope")).toBeUndefined();
  });
});

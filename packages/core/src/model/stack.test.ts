import { describe, expect, test } from "vitest";

import type { Dashfoo } from "./schema";
import { stackModel } from "./stack";

const nested = (): Dashfoo => ({
  activeTabsetId: "ts-a",
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "c", id: "t1", name: "A", type: "tab" }],
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
});

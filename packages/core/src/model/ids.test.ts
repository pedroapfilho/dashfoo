import { afterEach, describe, expect, test, vi } from "vitest";

import { createNodeId, createTabId } from "./ids";
import type { Dashfoo } from "./schema";
import { parseModel, toJSON } from "./serialize";
import { findDuplicateIds } from "./tree";

describe("createNodeId / createTabId", () => {
  test("apply the prefix and stay unique", () => {
    const a = createNodeId("tabset");
    const b = createNodeId("tabset");
    expect(a.startsWith("tabset-")).toBe(true);
    expect(a).not.toBe(b);
    expect(createTabId().startsWith("tab-")).toBe(true);
    expect(createNodeId().startsWith("node-")).toBe(true);
  });
});

const modelWith = (firstId: string, secondId: string): Dashfoo => ({
  floats: [],
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "c", id: firstId, name: "A", type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
      {
        children: [{ component: "c", id: secondId, name: "B", type: "tab" }],
        id: "ts2",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

describe("findDuplicateIds", () => {
  test("returns ids that appear more than once", () => {
    expect(findDuplicateIds(modelWith("dup", "dup"))).toEqual(["dup"]);
  });

  test("returns empty for a unique model", () => {
    expect(findDuplicateIds(modelWith("a", "b"))).toEqual([]);
  });
});

describe("parseModel duplicate-id diagnostic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("warns (does not throw) when a loaded model has duplicate ids", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    parseModel(JSON.parse(toJSON(modelWith("dup", "dup"))));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("dup"));
  });
});

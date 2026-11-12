import { describe, expect, test, vi } from "vitest";
import { ZodError } from "zod";

import type { Dashfoo, TabNode } from "./schema";
import { fromJSON, parseModel, restoreModel, toJSON } from "./serialize";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
  global: { tabLocation: "top" },
  layout: {
    children: [
      { children: [tab("t1"), tab("t2")], id: "ts1", selected: 0, type: "tabset", weight: 1 },
    ],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

describe("serialize", () => {
  test("toJSON then fromJSON round-trips a model", () => {
    expect(fromJSON(toJSON(model()))).toEqual(model());
  });

  test("round-trips sizing fields", () => {
    const input = model();
    const first = input.layout.children[0];

    if (first?.type === "tabset") {
      first.min = { unit: "px", value: 160 };
    }

    input.layout.children.push({
      children: [tab("t3")],
      id: "ts2",
      selected: 0,
      type: "tabset",
      weight: 1,
    });
    input.global.tabSetMinSize = 120;

    expect(fromJSON(toJSON(input))).toEqual(input);
  });

  test("round-trips the global editing flags", () => {
    const input = model();
    input.global.enableSplitResize = false;
    input.global.tabEnableDrag = false;

    expect(fromJSON(toJSON(input))).toEqual(input);
  });

  test("toJSON produces a parseable JSON string", () => {
    expect(JSON.parse(toJSON(model())).layout.id).toBe("root");
  });

  test("fromJSON throws on a structurally invalid model", () => {
    expect(() =>
      fromJSON(JSON.stringify({ global: {}, layout: { type: "row" }, version: 1 })),
    ).toThrow(ZodError);
  });

  test("fromJSON throws on malformed JSON", () => {
    expect(() => fromJSON("{ not json")).toThrow(SyntaxError);
  });

  test("parseModel validates an object and normalizes it", () => {
    const parsed = parseModel(model());

    expect(parsed.layout.children).toHaveLength(1);
  });

  test("parseModel rejects a payload without a version", () => {
    const { version: _version, ...withoutVersion } = model();

    expect(() => parseModel(withoutVersion)).toThrow(ZodError);
  });

  test("fromJSON rejects a payload with an unknown version", () => {
    expect(() => fromJSON(JSON.stringify({ ...model(), version: 2 }))).toThrow(ZodError);
  });
});

describe("restoreModel", () => {
  test("returns null and warns on data that is not a model", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(restoreModel({ layout: "nope" })).toBeNull();
    expect(restoreModel(null)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  test("tidies a valid model the way parseModel does", () => {
    const saved = model();
    saved.layout.children.push({
      children: [],
      id: "empty",
      selected: 4,
      type: "tabset",
      weight: 1,
    });

    expect(restoreModel(saved)).toEqual(model());
  });

  test("mapTab upgrades tabs, drops the ones it returns null for, and keeps the selection", () => {
    const saved = model();
    const first = saved.layout.children[0];

    if (first?.type === "tabset") {
      first.selected = 1;
    }

    saved.floats.push({
      geometry: { height: 100, left: 0, top: 0, width: 100 },
      id: "f1",
      layout: {
        children: [
          { children: [tab("legacy")], id: "ts2", selected: 0, type: "tabset", weight: 1 },
        ],
        id: "frow",
        orientation: "row",
        type: "row",
        weight: 1,
      },
      type: "float",
    });

    const restored = restoreModel(saved, {
      mapTab: (savedTab) =>
        savedTab.id === "t1" || savedTab.id === "legacy"
          ? null
          : { ...savedTab, component: "chart" },
    });

    expect(restored?.layout.children).toEqual([
      {
        children: [{ ...tab("t2"), component: "chart" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
    ]);
    expect(restored?.floats).toEqual([]);
  });

  test("returns null when mapTab produces an invalid tab", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      restoreModel(model(), { mapTab: (saved) => ({ ...saved, name: 42 }) as unknown as TabNode }),
    ).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

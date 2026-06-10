import { describe, expect, test } from "vitest";

import type { Dashfoo, TabNode } from "./schema";
import { fromJSON, parseModel, toJSON } from "./serialize";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: { tabLocation: "top" },
  layout: {
    children: [{ children: [tab("t1"), tab("t2")], id: "ts1", selected: 0, type: "tabset" }],
    id: "root",
    orientation: "row",
    type: "row",
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
    });
    input.global.tabSetMinSize = 120;

    expect(fromJSON(toJSON(input))).toEqual(input);
  });

  test("toJSON produces a parseable JSON string", () => {
    expect(JSON.parse(toJSON(model())).layout.id).toBe("root");
  });

  test("fromJSON throws on a structurally invalid model", () => {
    expect(() =>
      fromJSON(JSON.stringify({ global: {}, layout: { type: "row" }, version: 1 })),
    ).toThrow();
  });

  test("fromJSON throws on malformed JSON", () => {
    expect(() => fromJSON("{ not json")).toThrow();
  });

  test("parseModel validates an object and normalizes it", () => {
    const parsed = parseModel(model());

    expect(parsed.layout.children).toHaveLength(1);
  });

  test("parseModel rejects a payload without a version", () => {
    const { version: _version, ...withoutVersion } = model();

    expect(() => parseModel(withoutVersion)).toThrow();
  });

  test("fromJSON rejects a payload with an unknown version", () => {
    expect(() => fromJSON(JSON.stringify({ ...model(), version: 2 }))).toThrow();
  });
});

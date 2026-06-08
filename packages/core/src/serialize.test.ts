import { describe, expect, test } from "vitest";

import type { Dashfoo, TabNode } from "./schema";
import { CURRENT_VERSION, fromJSON, parseModel, toJSON } from "./serialize";

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
  version: CURRENT_VERSION,
});

describe("serialize", () => {
  test("toJSON then fromJSON round-trips a model", () => {
    expect(fromJSON(toJSON(model()))).toEqual(model());
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

  test("parseModel migrates a versionless payload to the current version", () => {
    const { version: _version, ...withoutVersion } = model();

    expect(parseModel(withoutVersion).version).toBe(CURRENT_VERSION);
  });

  test("fromJSON throws on a payload saved by a newer version", () => {
    expect(() => fromJSON(toJSON({ ...model(), version: 2 }))).toThrow(/newer version/v);
  });
});

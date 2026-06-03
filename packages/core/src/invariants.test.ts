import { describe, expect, test } from "vitest";

import { normalize } from "./invariants";
import type { Dashfoo, RowNode, TabNode, TabsetNode } from "./schema";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const tabset = (id: string, tabs: Array<TabNode>, extra: Partial<TabsetNode> = {}): TabsetNode => ({
  children: tabs,
  id,
  selected: 0,
  type: "tabset",
  ...extra,
});

const row = (id: string, children: RowNode["children"], extra: Partial<RowNode> = {}): RowNode => ({
  children,
  id,
  orientation: "row",
  type: "row",
  ...extra,
});

const model = (layout: RowNode, extra: Partial<Dashfoo> = {}): Dashfoo => ({
  global: {},
  layout,
  version: 1,
  ...extra,
});

describe("normalize", () => {
  test("removes an empty tabset", () => {
    const result = normalize(model(row("root", [tabset("empty", []), tabset("ts1", [tab("t1")])])));

    expect(result.layout.children.map((c) => c.id)).toEqual(["ts1"]);
  });

  test("removes a row left empty after its only tabset is dropped", () => {
    const result = normalize(
      model(row("root", [row("r1", [tabset("empty", [])]), tabset("ts1", [tab("t1")])])),
    );

    expect(result.layout.children.map((c) => c.id)).toEqual(["ts1"]);
  });

  test("collapses a single-child row, lifting the child and inheriting the row's weight", () => {
    const result = normalize(
      model(
        row("root", [
          row("r1", [tabset("ts1", [tab("t1")])], { weight: 30 }),
          tabset("ts2", [tab("t2")]),
        ]),
      ),
    );

    const lifted = result.layout.children[0];
    expect(result.layout.children.map((c) => c.id)).toEqual(["ts1", "ts2"]);
    expect(lifted?.type).toBe("tabset");
    expect(lifted?.weight).toBe(30);
  });

  test("clamps a tabset's selected index into range", () => {
    const ts = tabset("ts1", [tab("t1"), tab("t2")], { selected: 7 });
    const result = normalize(model(row("root", [ts])));

    expect((result.layout.children[0] as TabsetNode).selected).toBe(1);
  });

  test("reconciles a stale activeTabsetId to the first tabset", () => {
    const result = normalize(
      model(row("root", [tabset("ts1", [tab("t1")])]), { activeTabsetId: "ghost" }),
    );

    expect(result.activeTabsetId).toBe("ts1");
  });

  test("clears maximizedTabsetId when its tabset no longer exists", () => {
    const result = normalize(
      model(row("root", [tabset("ts1", [tab("t1")])]), { maximizedTabsetId: "ghost" }),
    );

    expect(result.maximizedTabsetId).toBeUndefined();
  });

  test("keeps a valid maximizedTabsetId", () => {
    const result = normalize(
      model(row("root", [tabset("ts1", [tab("t1")])]), { maximizedTabsetId: "ts1" }),
    );

    expect(result.maximizedTabsetId).toBe("ts1");
  });

  test("does not mutate the input model", () => {
    const input = model(row("root", [tabset("empty", []), tabset("ts1", [tab("t1")])]));
    normalize(input);

    expect(input.layout.children).toHaveLength(2);
  });
});

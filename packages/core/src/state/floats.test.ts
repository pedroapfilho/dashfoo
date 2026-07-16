import { describe, expect, test } from "vitest";

import { normalize } from "../model/invariants";
import type { Dashfoo, TabNode, TabsetNode } from "../model/schema";
import { collectTabsets, findDuplicateIds } from "../model/tree";

import { reducer } from "./reducer";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const baseModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
  layout: {
    children: [
      { children: [tab("t1"), tab("t2")], id: "ts1", selected: 0, type: "tabset", weight: 60 },
      { children: [tab("t3")], id: "ts2", selected: 0, type: "tabset", weight: 40 },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const onlyFloat = (model: Dashfoo) => {
  const floats = model.floats ?? [];
  expect(floats).toHaveLength(1);
  return floats[0]!;
};

const floatTabsets = (model: Dashfoo): Array<TabsetNode> =>
  collectTabsets({ ...model, floats: undefined, layout: onlyFloat(model).layout });

const mainTabsetIds = (model: Dashfoo): Array<string> =>
  model.layout.children.filter((c): c is TabsetNode => c.type === "tabset").map((c) => c.id);

describe("floatTab", () => {
  test("floats a tab into a new panel and removes it from the source tabset", () => {
    const next = reducer(baseModel(), { tabId: "t1", type: "floatTab" });

    const source = next.layout.children.find((c) => c.id === "ts1") as TabsetNode;
    expect(source.children.map((t) => t.id)).toEqual(["t2"]);

    const tabsets = floatTabsets(next);
    expect(tabsets).toHaveLength(1);
    expect(tabsets[0]?.children.map((t) => t.id)).toEqual(["t1"]);
  });

  test("floating the last tab drops the now-empty source tabset via normalize", () => {
    const next = reducer(baseModel(), { tabId: "t3", type: "floatTab" });

    expect(mainTabsetIds(next)).toEqual(["ts1"]);
    expect(next.floats).toHaveLength(1);
  });

  test("focus moves to the floated panel's tabset", () => {
    const next = reducer(baseModel(), { tabId: "t1", type: "floatTab" });

    expect(next.activeTabsetId).toBe(floatTabsets(next)[0]?.id);
  });

  test("uses the supplied geometry", () => {
    const geometry = { height: 480, left: 50, top: 60, width: 640 };
    const next = reducer(baseModel(), { geometry, tabId: "t1", type: "floatTab" });

    expect(onlyFloat(next).geometry).toEqual(geometry);
  });

  test("produces no duplicate ids", () => {
    const next = reducer(baseModel(), { tabId: "t1", type: "floatTab" });

    expect(findDuplicateIds(next)).toEqual([]);
  });
});

describe("floatTabset", () => {
  test("floats a whole tabset (preserving its id) into a new panel", () => {
    const next = reducer(baseModel(), { tabsetId: "ts2", type: "floatTabset" });

    expect(mainTabsetIds(next)).toEqual(["ts1"]);
    const tabsets = floatTabsets(next);
    expect(tabsets.map((t) => t.id)).toEqual(["ts2"]);
    expect(tabsets[0]?.children.map((t) => t.id)).toEqual(["t3"]);
  });
});

describe("dockFloat", () => {
  test("dock-back restores the float as its own panel (all tabs grouped), not merged", () => {
    const floated = reducer(baseModel(), { tabsetId: "ts2", type: "floatTabset" });
    const float = onlyFloat(floated);

    const next = reducer(floated, { floatId: float.id, type: "dockFloat" });

    expect(next.floats ?? []).toHaveLength(0);

    const restored = collectTabsets(next).find((ts) => ts.id === "ts2");
    expect(restored?.children.map((t) => t.id)).toEqual(["t3"]);
    const ts1 = collectTabsets(next).find((ts) => ts.id === "ts1");
    expect(ts1?.children.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  test("an explicit center location merges the float's tabs into the target", () => {
    const floated = reducer(baseModel(), { tabId: "t1", type: "floatTab" });
    const float = onlyFloat(floated);

    const next = reducer(floated, {
      floatId: float.id,
      location: "center",
      targetId: "ts1",
      type: "dockFloat",
    });

    const target = next.layout.children.find((c) => c.id === "ts1") as TabsetNode;
    expect(target.children.map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  test("preserves the tab selected inside the float when restoring as a panel", () => {
    const floated = reducer(baseModel(), { tabsetId: "ts1", type: "floatTabset" });
    const float = onlyFloat(floated);

    const selected = reducer(floated, { index: 1, tabsetId: "ts1", type: "selectTab" });

    const next = reducer(selected, { floatId: float.id, type: "dockFloat" });

    const restored = collectTabsets(next).find((ts) => ts.id === "ts1");
    expect(restored?.children.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(restored?.children[restored.selected]?.id).toBe("t2");
  });

  test("split location docks the float's tabs beside the target", () => {
    const floated = reducer(baseModel(), { tabsetId: "ts2", type: "floatTabset" });
    const float = onlyFloat(floated);

    const next = reducer(floated, {
      floatId: float.id,
      location: "split-right",
      targetId: "ts1",
      type: "dockFloat",
    });

    expect(next.floats ?? []).toHaveLength(0);

    const ids = collectTabsets(next).flatMap((ts) => ts.children.map((t) => t.id));
    expect(ids).toContain("t3");
  });

  test("ignores an unknown floatId", () => {
    const next = reducer(baseModel(), { floatId: "ghost", type: "dockFloat" });

    expect(next).toEqual(normalize(baseModel()));
  });

  test("center-dock with an empty lead tabset selects the first merged tab", () => {
    const model: Dashfoo = {
      ...baseModel(),
      floats: [
        {
          geometry: { height: 360, left: 0, top: 0, width: 480 },
          id: "f1",
          layout: {
            children: [
              { children: [], id: "fts-empty", selected: 0, type: "tabset", weight: 50 },
              {
                children: [tab("w1"), tab("w2")],
                id: "fts2",
                selected: 0,
                type: "tabset",
                weight: 50,
              },
            ],
            id: "frow",
            orientation: "row",
            type: "row",
          },
          type: "float",
        },
      ],
    };

    const next = reducer(model, {
      floatId: "f1",
      location: "center",
      targetId: "ts1",
      type: "dockFloat",
    });

    const target = collectTabsets(next).find((ts) => ts.id === "ts1");
    expect(target?.children.map((t) => t.id)).toEqual(["t1", "t2", "w1", "w2"]);
    expect(target?.children[target.selected]?.id).toBe("w1");
  });
});

describe("moveFloat", () => {
  test("updates a float's stored rect", () => {
    const floated = reducer(baseModel(), { tabId: "t1", type: "floatTab" });
    const float = onlyFloat(floated);
    const geometry = { height: 300, left: 10, top: 20, width: 400 };

    const next = reducer(floated, { floatId: float.id, geometry, type: "moveFloat" });

    expect(onlyFloat(next).geometry).toEqual(geometry);
  });
});

describe("float naming", () => {
  test("floats get their own incrementing name (Panel, Panel 1, …)", () => {
    const one = reducer(baseModel(), { tabsetId: "ts2", type: "floatTabset" });
    expect(onlyFloat(one).name).toBe("Panel");

    const two = reducer(one, { tabId: "t1", type: "floatTab" });
    expect((two.floats ?? []).map((f) => f.name)).toEqual(["Panel", "Panel 1"]);
  });

  test("renameFloat sets the window title", () => {
    const floated = reducer(baseModel(), { tabsetId: "ts2", type: "floatTabset" });
    const float = onlyFloat(floated);

    const next = reducer(floated, { floatId: float.id, name: "Inspector", type: "renameFloat" });

    expect(onlyFloat(next).name).toBe("Inspector");
  });

  test("renameFloat keeps names unique by appending a number", () => {
    const a = reducer(baseModel(), { tabsetId: "ts2", type: "floatTabset" });
    const b = reducer(a, { tabId: "t1", type: "floatTab" });
    const [first, second] = b.floats ?? [];

    const r1 = reducer(b, { floatId: first!.id, name: "Foo", type: "renameFloat" });
    const r2 = reducer(r1, { floatId: second!.id, name: "Foo", type: "renameFloat" });

    expect((r2.floats ?? []).map((f) => f.name)).toEqual(["Foo", "Foo 1"]);
  });
});

describe("setFloatMinimized", () => {
  test("toggles a float's minimized flag", () => {
    const floated = reducer(baseModel(), { tabId: "t1", type: "floatTab" });
    const float = onlyFloat(floated);

    const minimized = reducer(floated, {
      floatId: float.id,
      minimized: true,
      type: "setFloatMinimized",
    });
    expect(onlyFloat(minimized).minimized).toBe(true);

    const restored = reducer(minimized, {
      floatId: float.id,
      minimized: false,
      type: "setFloatMinimized",
    });
    expect(onlyFloat(restored).minimized).toBe(false);
  });
});

describe("normalize with floats", () => {
  test("drops a float whose layout emptied out", () => {
    const model: Dashfoo = {
      ...baseModel(),
      floats: [
        {
          geometry: { height: 360, left: 0, top: 0, width: 480 },
          id: "f1",
          layout: { children: [], id: "frow", orientation: "row", type: "row" },
          type: "float",
        },
      ],
    };

    expect(normalize(model).floats).toBeUndefined();
  });

  test("keeps a float with content and heals its selected index", () => {
    const model: Dashfoo = {
      ...baseModel(),
      floats: [
        {
          geometry: { height: 360, left: 0, top: 0, width: 480 },
          id: "f1",
          layout: {
            children: [{ children: [tab("w1")], id: "fts", selected: 9, type: "tabset" }],
            id: "frow",
            orientation: "row",
            type: "row",
          },
          type: "float",
        },
      ],
    };

    const next = normalize(model);
    expect(next.floats).toHaveLength(1);
    const floatTabset = next.floats?.[0]?.layout.children[0] as TabsetNode;
    expect(floatTabset.selected).toBe(0);
  });

  test("collectTabsets and findDuplicateIds span float roots", () => {
    const floated = reducer(baseModel(), { tabId: "t1", type: "floatTab" });

    const allTabIds = collectTabsets(floated).flatMap((ts) => ts.children.map((t) => t.id));
    expect(allTabIds.toSorted()).toEqual(["t1", "t2", "t3"]);
    expect(findDuplicateIds(floated)).toEqual([]);
  });
});

describe("actions still resolve nodes that live inside a float", () => {
  test("selectTab and renameTab reach a float's tabset/tab", () => {
    const floated = reducer(baseModel(), { tabsetId: "ts1", type: "floatTabset" });

    const renamed = reducer(floated, { name: "Floated", tabId: "t1", type: "renameTab" });
    const floatTabset = onlyFloat(renamed).layout.children[0] as TabsetNode;

    expect(floatTabset.children[0]?.name).toBe("Floated");

    const selected = reducer(renamed, { index: 1, tabsetId: "ts1", type: "selectTab" });
    expect((onlyFloat(selected).layout.children[0] as TabsetNode).selected).toBe(1);
  });
});

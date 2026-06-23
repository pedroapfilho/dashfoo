import { describe, expect, test } from "vitest";

import { normalize } from "../model/invariants";
import type { Dashfoo, TabNode, TabsetNode } from "../model/schema";
import { collectTabsets, findDuplicateIds } from "../model/tree";

import { reducer } from "./reducer";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

// Two-tabset main layout: ts1 has t1/t2, ts2 has t3.
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

const onlyWindow = (model: Dashfoo) => {
  const windows = model.windows ?? [];
  expect(windows).toHaveLength(1);
  return windows[0]!;
};

const mainTabsetIds = (model: Dashfoo): Array<string> =>
  model.layout.children.filter((c): c is TabsetNode => c.type === "tabset").map((c) => c.id);

describe("detachTab", () => {
  test("pops a tab into a new window and removes it from the source tabset", () => {
    const next = reducer(baseModel(), { tabId: "t1", type: "detachTab" });

    const source = next.layout.children.find((c) => c.id === "ts1") as TabsetNode;
    expect(source.children.map((t) => t.id)).toEqual(["t2"]);

    const window = onlyWindow(next);
    const windowTabsets = collectTabsets({ ...next, layout: window.layout, windows: undefined });
    expect(windowTabsets).toHaveLength(1);
    expect(windowTabsets[0]?.children.map((t) => t.id)).toEqual(["t1"]);
  });

  test("popping the last tab drops the now-empty source tabset via normalize", () => {
    const next = reducer(baseModel(), { tabId: "t3", type: "detachTab" });

    expect(mainTabsetIds(next)).toEqual(["ts1"]);
    expect(next.windows).toHaveLength(1);
  });

  test("focus moves to the detached window's tabset", () => {
    const next = reducer(baseModel(), { tabId: "t1", type: "detachTab" });
    const window = onlyWindow(next);
    const firstWindowTabset = collectTabsets({
      ...next,
      layout: window.layout,
      windows: undefined,
    })[0];

    expect(next.activeTabsetId).toBe(firstWindowTabset?.id);
  });

  test("uses the supplied geometry", () => {
    const geometry = { height: 480, left: 50, top: 60, width: 640 };
    const next = reducer(baseModel(), { geometry, tabId: "t1", type: "detachTab" });

    expect(onlyWindow(next).geometry).toEqual(geometry);
  });

  test("produces no duplicate ids", () => {
    const next = reducer(baseModel(), { tabId: "t1", type: "detachTab" });

    expect(findDuplicateIds(next)).toEqual([]);
  });
});

describe("detachTabset", () => {
  test("pops a whole tabset (preserving its id) into a new window", () => {
    const next = reducer(baseModel(), { tabsetId: "ts2", type: "detachTabset" });

    expect(mainTabsetIds(next)).toEqual(["ts1"]);
    const window = onlyWindow(next);
    const windowTabsets = collectTabsets({ ...next, layout: window.layout, windows: undefined });
    expect(windowTabsets.map((t) => t.id)).toEqual(["ts2"]);
    expect(windowTabsets[0]?.children.map((t) => t.id)).toEqual(["t3"]);
  });
});

describe("reattachWindow", () => {
  test("docks the window's tabs back into the active main tabset (center) and drops the window", () => {
    const detached = reducer(baseModel(), { tabId: "t1", type: "detachTab" });
    const window = onlyWindow(detached);

    const next = reducer(detached, {
      targetId: "ts1",
      type: "reattachWindow",
      windowId: window.id,
    });

    expect(next.windows ?? []).toHaveLength(0);
    const target = next.layout.children.find((c) => c.id === "ts1") as TabsetNode;
    expect(target.children.map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  test("preserves the tab selected inside the window when docking back (center)", () => {
    const detached = reducer(baseModel(), { tabsetId: "ts1", type: "detachTabset" });
    const window = onlyWindow(detached);
    // ts1 (t1, t2) is now in the window; select its second tab there.
    const selected = reducer(detached, { index: 1, tabsetId: "ts1", type: "selectTab" });

    const next = reducer(selected, {
      targetId: "ts2",
      type: "reattachWindow",
      windowId: window.id,
    });

    const target = next.layout.children.find((c) => c.id === "ts2") as TabsetNode;
    // ts2 had [t3]; the window's [t1, t2] merge after it, focus on t2 (the popup pick).
    expect(target.children.map((t) => t.id)).toEqual(["t3", "t1", "t2"]);
    expect(target.children[target.selected]?.id).toBe("t2");
  });

  test("preserves the selected tab when docking back as a split", () => {
    const detached = reducer(baseModel(), { tabsetId: "ts1", type: "detachTabset" });
    const window = onlyWindow(detached);
    const selected = reducer(detached, { index: 1, tabsetId: "ts1", type: "selectTab" });

    const next = reducer(selected, {
      location: "split-right",
      targetId: "ts2",
      type: "reattachWindow",
      windowId: window.id,
    });

    const placed = collectTabsets(next).find((ts) => ts.children.some((t) => t.id === "t1"));
    expect(placed?.children[placed.selected]?.id).toBe("t2");
  });

  test("split location docks the window's tabs beside the target", () => {
    const detached = reducer(baseModel(), { tabsetId: "ts2", type: "detachTabset" });
    const window = onlyWindow(detached);

    const next = reducer(detached, {
      location: "split-right",
      targetId: "ts1",
      type: "reattachWindow",
      windowId: window.id,
    });

    expect(next.windows ?? []).toHaveLength(0);
    // t3 lives somewhere back in the main layout again.
    const ids = collectTabsets(next).flatMap((ts) => ts.children.map((t) => t.id));
    expect(ids).toContain("t3");
  });

  test("ignores an unknown windowId", () => {
    const next = reducer(baseModel(), { type: "reattachWindow", windowId: "ghost" });

    expect(next).toEqual(normalize(baseModel()));
  });
});

describe("updateWindowGeometry", () => {
  test("updates a window's stored rect", () => {
    const detached = reducer(baseModel(), { tabId: "t1", type: "detachTab" });
    const window = onlyWindow(detached);
    const geometry = { height: 300, left: 10, top: 20, width: 400 };

    const next = reducer(detached, { geometry, type: "updateWindowGeometry", windowId: window.id });

    expect(onlyWindow(next).geometry).toEqual(geometry);
  });
});

describe("normalize with windows", () => {
  test("drops a window whose layout emptied out", () => {
    const model: Dashfoo = {
      ...baseModel(),
      windows: [
        {
          geometry: { height: 600, left: 0, top: 0, width: 800 },
          id: "win1",
          layout: { children: [], id: "winrow", orientation: "row", type: "row" },
          type: "window",
        },
      ],
    };

    expect(normalize(model).windows).toBeUndefined();
  });

  test("keeps a window with content and heals its selected index", () => {
    const model: Dashfoo = {
      ...baseModel(),
      windows: [
        {
          geometry: { height: 600, left: 0, top: 0, width: 800 },
          id: "win1",
          layout: {
            children: [{ children: [tab("w1")], id: "wts", selected: 9, type: "tabset" }],
            id: "winrow",
            orientation: "row",
            type: "row",
          },
          type: "window",
        },
      ],
    };

    const next = normalize(model);
    expect(next.windows).toHaveLength(1);
    const windowTabset = next.windows?.[0]?.layout.children[0] as TabsetNode;
    expect(windowTabset.selected).toBe(0);
  });

  test("collectTabsets and findDuplicateIds span window roots", () => {
    const detached = reducer(baseModel(), { tabId: "t1", type: "detachTab" });

    // t1 (now in a window) and t2/t3 (main) are all reachable.
    const allTabIds = collectTabsets(detached).flatMap((ts) => ts.children.map((t) => t.id));
    expect(allTabIds.toSorted()).toEqual(["t1", "t2", "t3"]);
    expect(findDuplicateIds(detached)).toEqual([]);
  });
});

describe("actions still resolve nodes that live inside a window", () => {
  test("selectTab and renameTab reach a window's tabset/tab", () => {
    const detached = reducer(baseModel(), { tabsetId: "ts1", type: "detachTabset" });
    // ts1 (with t1, t2) now lives in a window.
    const renamed = reducer(detached, { name: "Popped", tabId: "t1", type: "renameTab" });
    const window = onlyWindow(renamed);
    const windowTabset = window.layout.children[0] as TabsetNode;

    expect(windowTabset.children[0]?.name).toBe("Popped");

    const selected = reducer(renamed, { index: 1, tabsetId: "ts1", type: "selectTab" });
    const selectedWindow = onlyWindow(selected);
    expect((selectedWindow.layout.children[0] as TabsetNode).selected).toBe(1);
  });
});

import { afterEach, describe, expect, test, vi } from "vitest";

import type { Dashfoo, TabNode, TabsetNode } from "../model/schema";
import { findTab, findTabset } from "../model/tree";

import type { Action } from "./actions";
import { fallbackSelectedIndex } from "./docking";
import { reducer } from "./reducer";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const strip = (id: string, ids: Array<string>, selected = 0): TabsetNode => ({
  children: ids.map(tab),
  id,
  selected,
  type: "tabset",
  weight: 1,
});

/** `ts2` is active so that no expected receiver coincides with the focus before the drop. */
const dockingModel = (): Dashfoo => ({
  activeTabsetId: "ts2",
  floats: [
    {
      geometry: { height: 200, left: 0, top: 0, width: 300 },
      id: "f1",
      layout: {
        children: [strip("fts", ["t5"])],
        id: "frow",
        orientation: "row",
        type: "row",
        weight: 1,
      },
      type: "float",
    },
  ],
  global: {},
  layout: {
    children: [strip("ts1", ["t1", "t2"]), strip("ts2", ["t3"]), strip("ts3", ["t4"])],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

const selectedTabOf = (model: Dashfoo, tabsetId: string): string | undefined => {
  const found = findTabset(model, tabsetId);
  return found?.children[found.selected]?.id;
};

const threeTabs = (selected: number): Dashfoo => ({
  ...dockingModel(),
  layout: {
    children: [strip("ts1", ["a", "b", "c"], selected), strip("ts2", ["t3"])],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
});

type FocusCase = { action: Action; name: string; receiverHolds: string };

const FOCUS_CASES: Array<FocusCase> = [
  {
    action: { location: "center", sourceId: "t1", targetId: "ts3", type: "moveNode" },
    name: "moveNode center",
    receiverHolds: "t1",
  },
  {
    action: { location: "split-right", sourceId: "t1", targetId: "ts3", type: "moveNode" },
    name: "moveNode split",
    receiverHolds: "t1",
  },
  {
    action: { location: "center", sourceId: "ts2", targetId: "ts3", type: "moveTabset" },
    name: "moveTabset center",
    receiverHolds: "t3",
  },
  {
    action: { location: "split-bottom", sourceId: "ts1", targetId: "ts3", type: "moveTabset" },
    name: "moveTabset split",
    receiverHolds: "t1",
  },
  {
    action: { location: "center", tab: tab("new"), targetId: "ts3", type: "addNode" },
    name: "addNode center",
    receiverHolds: "new",
  },
  {
    action: { location: "split-left", tab: tab("new"), targetId: "ts1", type: "addNode" },
    name: "addNode split",
    receiverHolds: "new",
  },
  {
    action: { floatId: "f1", location: "center", targetId: "ts3", type: "dockFloat" },
    name: "dockFloat center",
    receiverHolds: "t5",
  },
  {
    action: { floatId: "f1", location: "split-top", targetId: "ts1", type: "dockFloat" },
    name: "dockFloat split",
    receiverHolds: "t5",
  },
  { action: { tabId: "t1", type: "floatTab" }, name: "floatTab", receiverHolds: "t1" },
  {
    action: { tabsetId: "ts1", type: "floatTabset" },
    name: "floatTabset",
    receiverHolds: "t1",
  },
];

describe("focus after a docking action", () => {
  test.each(FOCUS_CASES)("$name activates the tabset that received the content", (focusCase) => {
    const next = reducer(dockingModel(), focusCase.action);

    const receiver = findTab(next, focusCase.receiverHolds)?.container.id;
    expect(receiver).toBeDefined();
    expect(next.activeTabsetId).toBe(receiver);
  });

  test("a rejected drop leaves focus where it was", () => {
    const input = dockingModel();

    expect(
      reducer(input, { location: "center", sourceId: "t1", targetId: "ghost", type: "moveNode" }),
    ).toBe(input);
  });
});

describe("selection after a tab leaves its strip", () => {
  test("removing a tab before the selected one keeps that tab selected", () => {
    expect(selectedTabOf(reducer(threeTabs(1), { tabId: "a", type: "deleteTab" }), "ts1")).toBe(
      "b",
    );
    expect(
      selectedTabOf(
        reducer(threeTabs(2), {
          location: "center",
          sourceId: "a",
          targetId: "ts2",
          type: "moveNode",
        }),
        "ts1",
      ),
    ).toBe("c");
  });

  test("removing a tab after the selected one keeps that tab selected", () => {
    expect(selectedTabOf(reducer(threeTabs(0), { tabId: "c", type: "deleteTab" }), "ts1")).toBe(
      "a",
    );
  });

  test("removing the selected tab passes the selection to its right neighbour, else its left", () => {
    expect(selectedTabOf(reducer(threeTabs(1), { tabId: "b", type: "deleteTab" }), "ts1")).toBe(
      "c",
    );
    expect(selectedTabOf(reducer(threeTabs(2), { tabId: "c", type: "deleteTab" }), "ts1")).toBe(
      "b",
    );
  });

  test("fallbackSelectedIndex names that neighbour in the strip as it stands", () => {
    expect(fallbackSelectedIndex(3, 1)).toBe(2);
    expect(fallbackSelectedIndex(3, 2)).toBe(1);
    expect(fallbackSelectedIndex(1, 0)).toBe(-1);
  });
});

describe("addNode with an id already in the layout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each(["t1", "ts2", "root", "f1"])(
    "rejects id %s with a warning instead of duplicating it",
    (id) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const input = dockingModel();

      expect(
        reducer(input, { location: "center", tab: tab(id), targetId: "ts1", type: "addNode" }),
      ).toBe(input);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`[dashfoo] addNode ignored`));
    },
  );
});

import { describe, expect, test } from "vitest";

import { model, row, tab, tabset } from "../model/builders";
import { normalize } from "../model/invariants";
import type { Dashfoo, TabsetNode } from "../model/schema";
import { findTabset } from "../model/tree";

import { reducer } from "./reducer";

const panel = (next: Dashfoo, id: string): TabsetNode | undefined => findTabset(next, id);

const editorAndTerminal = (terminal: Partial<TabsetNode> = {}): Dashfoo =>
  normalize(
    model(
      row(
        [
          tabset([tab("editor", "Editor")], { id: "main", weight: 3 }),
          tabset([tab("term", "Terminal"), tab("logs", "Logs")], {
            collapsible: true,
            id: "bottom",
            ...terminal,
          }),
        ],
        { id: "root", orientation: "column" },
      ),
    ),
  );

describe("setTabsetCollapsed", () => {
  test("collapses a collapsible tabset and keeps its weight", () => {
    const next = reducer(editorAndTerminal(), {
      collapsed: true,
      tabsetId: "bottom",
      type: "setTabsetCollapsed",
    });

    expect(panel(next, "bottom")).toMatchObject({ collapsed: true, weight: 1 });
  });

  test("ignores a tabset that is not collapsible", () => {
    const input = editorAndTerminal({ collapsible: false });

    expect(
      reducer(input, { collapsed: true, tabsetId: "bottom", type: "setTabsetCollapsed" }),
    ).toBe(input);
  });

  test("never collapses the last expanded child of a split", () => {
    const input = normalize(
      model(
        row([
          tabset([tab("a", "A")], { collapsible: true, id: "left" }),
          tabset([tab("b", "B")], { collapsed: true, collapsible: true, id: "right" }),
        ]),
      ),
    );

    expect(reducer(input, { collapsed: true, tabsetId: "left", type: "setTabsetCollapsed" })).toBe(
      input,
    );
  });

  test("expands a collapsed tabset", () => {
    const next = reducer(editorAndTerminal({ collapsed: true }), {
      collapsed: false,
      tabsetId: "bottom",
      type: "setTabsetCollapsed",
    });

    expect(panel(next, "bottom")?.collapsed).toBeUndefined();
  });

  test("selecting a tab expands its tabset", () => {
    const next = reducer(editorAndTerminal({ collapsed: true }), {
      index: 1,
      tabsetId: "bottom",
      type: "selectTab",
    });

    expect(panel(next, "bottom")).toMatchObject({ collapsed: undefined, selected: 1 });
  });

  test("turning collapsible off expands the tabset", () => {
    const next = reducer(editorAndTerminal({ collapsed: true }), {
      attrs: { collapsible: false },
      nodeId: "bottom",
      type: "updateNodeAttributes",
    });

    expect(panel(next, "bottom")?.collapsed).toBeUndefined();
  });

  test("a split left with only collapsed children expands them", () => {
    const next = reducer(editorAndTerminal({ collapsed: true }), {
      tabsetId: "main",
      type: "deleteTabset",
    });

    expect(panel(next, "bottom")?.collapsed).toBeUndefined();
  });
});

const strip = (policy?: "neighbor" | "recent"): Dashfoo =>
  normalize(
    model(
      row([tabset([tab("a", "A"), tab("b", "B"), tab("c", "C"), tab("d", "D")], { id: "ts" })]),
      {
        global: { tabSetSelectOnRemove: policy },
      },
    ),
  );

const select = (input: Dashfoo, index: number): Dashfoo =>
  reducer(input, { index, tabsetId: "ts", type: "selectTab" });

const selectedId = (input: Dashfoo): string | undefined => {
  const node = panel(input, "ts");

  return node?.children[node.selected]?.id;
};

describe("tabSetSelectOnRemove", () => {
  test("recent records each selection, newest first", () => {
    const next = select(select(strip("recent"), 3), 1);

    expect(panel(next, "ts")?.selectionHistory).toEqual(["b", "d", "a"]);
  });

  test("recent hands the selection back to the previously selected tab", () => {
    const next = reducer(select(select(strip("recent"), 3), 1), { tabId: "b", type: "deleteTab" });

    expect(selectedId(next)).toBe("d");
    expect(panel(next, "ts")?.selectionHistory).toEqual(["d", "a"]);
  });

  test("recent applies when the selected tab is dragged out", () => {
    const input = select(
      reducer(
        model(
          row([
            tabset([tab("a", "A"), tab("b", "B"), tab("c", "C")], { id: "ts" }),
            tabset([tab("x", "X")], { id: "other" }),
          ]),
          { global: { tabSetSelectOnRemove: "recent" } },
        ),
        { index: 2, tabsetId: "ts", type: "selectTab" },
      ),
      0,
    );

    const next = reducer(input, {
      location: "center",
      sourceId: "a",
      targetId: "other",
      type: "moveNode",
    });

    expect(selectedId(next)).toBe("c");
  });

  test("neighbor keeps no history and picks the right neighbour", () => {
    const next = reducer(select(select(strip(), 3), 1), { tabId: "b", type: "deleteTab" });

    expect(panel(next, "ts")?.selectionHistory).toBeUndefined();
    expect(selectedId(next)).toBe("c");
  });
});

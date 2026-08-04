import { describe, expect, test, vi } from "vitest";

import { model, row, tab, tabset } from "./builders";
import { dashfooSchema } from "./schema";

describe("tab", () => {
  test("defaults id to the component name and stamps type", () => {
    expect(tab("chart", "Chart")).toEqual({
      component: "chart",
      id: "chart",
      name: "Chart",
      type: "tab",
    });
  });

  test("honors an explicit id and passes through optional attributes", () => {
    expect(
      tab("chart", "Chart", {
        config: { symbol: "BTC" },
        enableClose: false,
        id: "t1",
      }),
    ).toEqual({
      component: "chart",
      config: { symbol: "BTC" },
      enableClose: false,
      id: "t1",
      name: "Chart",
      type: "tab",
    });
  });
});

describe("tabset", () => {
  test("defaults selected to 0, auto-generates a tabset id, stamps type", () => {
    const node = tabset([tab("chart", "Chart")]);
    expect(node.type).toBe("tabset");
    expect(node.selected).toBe(0);
    expect(node.id.startsWith("tabset-")).toBe(true);
    expect(node.children).toHaveLength(1);
  });

  test("honors explicit id, selected, and weight", () => {
    const node = tabset([tab("a", "A"), tab("b", "B")], {
      id: "ts-1",
      selected: 1,
      weight: 2,
    });
    expect(node.id).toBe("ts-1");
    expect(node.selected).toBe(1);
    expect(node.weight).toBe(2);
  });

  test("defaults weight to one relative share", () => {
    expect(tabset([tab("chart", "Chart")]).weight).toBe(1);
  });

  test("clamps selected into the strip it was given", () => {
    expect(tabset([tab("a", "A"), tab("b", "B")], { selected: 7 }).selected).toBe(1);
    expect(tabset([tab("a", "A"), tab("b", "B")], { selected: -2 }).selected).toBe(0);
    expect(tabset([tab("a", "A"), tab("b", "B")], { selected: 1.5 }).selected).toBe(1);
    expect(tabset([tab("a", "A")], { selected: Number.NaN }).selected).toBe(0);
  });

  test("flows an optional name through to label the tablist", () => {
    const node = tabset([tab("chart", "Chart")], { name: "Charts" });
    expect(node.name).toBe("Charts");
  });

  test("converts numeric tabset dimensions to px and preserves dimension objects", () => {
    const node = tabset([tab("chart", "Chart")], {
      max: { unit: "%", value: 80 },
      min: 100,
    });

    expect(node.max).toEqual({ unit: "%", value: 80 });
    expect(node.min).toEqual({ unit: "px", value: 100 });
  });
});

describe("row", () => {
  test("defaults orientation to row, auto-generates a row id, stamps type", () => {
    const node = row([tabset([tab("a", "A")])]);
    expect(node.type).toBe("row");
    expect(node.orientation).toBe("row");
    expect(node.id.startsWith("row-")).toBe(true);
  });

  test("honors explicit id, orientation, and weight", () => {
    const node = row([tabset([tab("a", "A")])], {
      id: "root",
      orientation: "column",
      weight: 3,
    });
    expect(node.id).toBe("root");
    expect(node.orientation).toBe("column");
    expect(node.weight).toBe(3);
  });

  test("defaults weight to one relative share", () => {
    expect(row([tabset([tab("a", "A")])]).weight).toBe(1);
  });

  test("converts numeric row dimensions to px and preserves dimension objects", () => {
    const node = row([tabset([tab("a", "A")])], {
      max: { unit: "%", value: 90 },
      min: 240,
    });

    expect(node.max).toEqual({ unit: "%", value: 90 });
    expect(node.min).toEqual({ unit: "px", value: 240 });
  });

  test("passes a per-split snap config through to the row node", () => {
    const node = row([tabset([tab("a", "A")]), tabset([tab("b", "B")])], {
      snap: { step: 25, threshold: 5 },
    });

    expect(node.snap).toEqual({ step: 25, threshold: 5 });
  });
});

describe("model", () => {
  test("stamps version 1 and defaults global and floats to empty", () => {
    const m = model(row([tabset([tab("a", "A")], { id: "ts" })], { id: "root" }));
    expect(m.version).toBe(1);
    expect(m.global).toEqual({});
    expect(m.floats).toEqual([]);
  });

  test("honors activeTabsetId and global overrides", () => {
    const m = model(row([tabset([tab("a", "A")], { id: "ts" })], { id: "root" }), {
      activeTabsetId: "ts",
      global: { splitterSize: 8 },
    });
    expect(m.activeTabsetId).toBe("ts");
    expect(m.global).toEqual({ splitterSize: 8 });
  });

  test("warns on duplicate node ids from two same-component tabs lacking explicit ids", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      model(
        row([tabset([tab("chart", "Left"), tab("chart", "Right")], { id: "ts" })], { id: "root" }),
      );
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain("chart");
    } finally {
      warn.mockRestore();
    }
  });

  test("produces a schema-valid model the parser accepts", () => {
    const m = model(
      row(
        [
          tabset([tab("chart", "Chart"), tab("depth", "Depth")], {
            id: "left",
            weight: 2,
          }),
          tabset([tab("book", "Order Book")], { id: "right" }),
        ],
        { id: "root" },
      ),
      { activeTabsetId: "left" },
    );
    expect(() => dashfooSchema.parse(m)).not.toThrow();
  });
});

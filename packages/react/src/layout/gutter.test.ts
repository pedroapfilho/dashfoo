import type { RowNode, TabsetNode } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import { descendantMinSize } from "./row-view";
import { measureGutter } from "./use-gutter";

const tabset = (id: string): TabsetNode => ({
  children: [{ component: "c", id: `${id}-tab`, name: id, type: "tab" }],
  id,
  selected: 0,
  type: "tabset",
  weight: 1,
});

const row = (orientation: RowNode["orientation"], children: RowNode["children"]): RowNode => ({
  children,
  id: `row-${orientation}`,
  orientation,
  type: "row",
  weight: 1,
});

describe("gutters in nested minimum sizes", () => {
  test("a nested row on the same axis adds a gutter per boundary", () => {
    const nested = row("row", [tabset("a"), tabset("b"), tabset("c")]);

    expect(descendantMinSize(nested, "row", 100, 0)).toBe(300);
    expect(descendantMinSize(nested, "row", 100, 12)).toBe(324);
  });

  test("a nested row across the axis takes its largest child, with no gutter", () => {
    const nested = row("column", [tabset("a"), tabset("b")]);

    expect(descendantMinSize(nested, "row", 100, 12)).toBe(100);
  });

  test("measures the splitter plus the row gap on both sides", () => {
    const group = document.createElement("div");
    group.style.columnGap = "4px";

    for (const kind of ["panel", "splitter", "panel", "splitter", "panel"]) {
      const element = document.createElement("div");
      element.dataset.dashfoo = kind;
      Object.defineProperty(element, "offsetWidth", { value: kind === "splitter" ? 6 : 100 });
      group.append(element);
    }

    document.body.append(group);

    expect(measureGutter(group, true)).toBe(14);
    expect(measureGutter(document.createElement("div"), true)).toBeUndefined();
    group.remove();
  });
});

import type { TabNode, TabsetNode } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import { resolveLayoutOptions, tabCapabilities, tabsetCapabilities } from "./capabilities";

const tab = (attrs: Partial<TabNode> = {}): TabNode => ({
  component: "c",
  id: "t1",
  name: "Tab",
  type: "tab",
  ...attrs,
});

const tabset = (attrs: Partial<TabsetNode> = {}): TabsetNode => ({
  children: [tab()],
  id: "ts1",
  selected: 0,
  type: "tabset",
  weight: 1,
  ...attrs,
});

describe("capabilities", () => {
  test("everything is allowed by default except floating", () => {
    const layout = resolveLayoutOptions({}, {});
    const can = tabsetCapabilities(layout, tabset());

    expect(layout).toMatchObject({ canDock: true, editable: true, floatable: false });

    expect(can).toEqual({
      closableTabs: true,
      draggable: true,
      draggableTabs: true,
      maximizable: true,
      renamableTabs: true,
    });

    expect(tabCapabilities(can, tab())).toEqual({
      closable: true,
      draggable: true,
      renamable: true,
    });
  });

  test("a frozen tree keeps tabs closable and renamable but drags nothing", () => {
    const layout = resolveLayoutOptions({}, { floatable: true, restructurable: false });
    const can = tabsetCapabilities(layout, tabset());

    expect(layout).toMatchObject({ canDock: false, editable: true, floatable: false });
    expect(can).toMatchObject({ closableTabs: true, draggable: false, draggableTabs: false });
    expect(tabCapabilities(can, tab())).toEqual({
      closable: true,
      draggable: false,
      renamable: true,
    });
  });

  test("the host, the model, the tabset and the tab can each switch a capability off", () => {
    const allowed = resolveLayoutOptions({}, {});

    expect(resolveLayoutOptions({ tabEnableClose: false }, {}).closableTabs).toBe(false);
    expect(resolveLayoutOptions({}, { closableTabs: false }).closableTabs).toBe(false);
    expect(tabsetCapabilities(allowed, tabset({ enableClose: false })).closableTabs).toBe(false);

    expect(
      tabCapabilities(tabsetCapabilities(allowed, tabset()), tab({ enableClose: false })).closable,
    ).toBe(false);
  });

  test("one tab that cannot be dragged pins its tabset", () => {
    const layout = resolveLayoutOptions({}, {});
    const pinned = tabset({ children: [tab(), tab({ enableDrag: false, id: "t2" })] });

    expect(tabsetCapabilities(layout, pinned).draggable).toBe(false);
    expect(tabsetCapabilities(layout, tabset({ enableDrag: false })).draggable).toBe(false);
  });
});

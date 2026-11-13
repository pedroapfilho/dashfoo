import type { Dashfoo, TabNode } from "@dashfoo/core";
import type { DropResolution } from "@dashfoo/core/internal";
import { act, render } from "@testing-library/react";
import { useContext } from "react";
import { assert, describe, expect, test } from "vitest";

import { DashfooLayout } from "../layout/dashfoo-layout";

import type { DragContextValue } from "./drag-context";
import { DragContext } from "./drag-context";
import { sameDropResolution } from "./drag-hooks";

const tabset = (id: string, tabs: Array<TabNode>, enableDrag?: boolean) => ({
  children: tabs,
  enableDrag,
  id,
  selected: 0,
  type: "tabset" as const,
  weight: 1,
});

const tab = (id: string, enableDrag?: boolean): TabNode => ({
  component: "probe",
  enableDrag,
  id,
  name: id.toUpperCase(),
  type: "tab",
});

const model = (tabsets: Dashfoo["layout"]["children"]): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
  global: {},
  layout: { children: tabsets, id: "root", orientation: "row", type: "row", weight: 1 },
  version: 1,
});

const seen: { context: DragContextValue | null } = { context: null };

const Probe = (): null => {
  seen.context = useContext(DragContext);

  return null;
};

const renderLayout = (layout: Dashfoo): DragContextValue => {
  render(<DashfooLayout components={{ probe: Probe }} defaultModel={layout} />);
  assert(seen.context);

  return seen.context;
};

const zone = (x: number) => ({ kind: "zone" as const, rect: { height: 10, width: 10, x, y: 0 } });

const resolution = (x: number, scope: string): DropResolution => ({
  indicator: zone(x),
  intent: { location: "split-left", targetId: "ts2" },
  scope,
});

const indicators = (): Array<HTMLElement> => [
  ...document.querySelectorAll<HTMLElement>('[data-dashfoo="dock-indicator"]'),
];

describe("sameDropResolution", () => {
  test("compares scope, intent and indicator by value", () => {
    expect(sameDropResolution(null, null)).toBe(true);
    expect(sameDropResolution(resolution(1, "a"), resolution(1, "a"))).toBe(true);
    expect(sameDropResolution(resolution(1, "a"), resolution(2, "a"))).toBe(false);
    expect(sameDropResolution(resolution(1, "a"), resolution(1, "b"))).toBe(false);
    expect(sameDropResolution(resolution(1, "a"), null)).toBe(false);
  });
});

describe("dock indicator", () => {
  test("is one element for the whole drag that idles off target and leaves when the drag ends", () => {
    const { actorRef, layerId } = renderLayout(
      model([tabset("ts1", [tab("a")]), tabset("ts2", [tab("b")])]),
    );

    assert(layerId !== null);

    act(() => {
      actorRef.send({ subject: { documentId: "d", id: "x", kind: "tab" }, type: "START" });
    });
    expect(indicators()).toHaveLength(0);

    act(() => {
      actorRef.send({ drop: resolution(10, layerId), type: "OVER" });
    });
    const [first] = indicators();
    assert(first);
    expect(first.dataset.idle).toBeUndefined();

    act(() => {
      actorRef.send({ drop: resolution(20, layerId), type: "OVER" });
    });
    expect(indicators()).toEqual([first]);
    expect(first.style.getPropertyValue("--dashfoo-dock-left")).toBe("20px");

    act(() => {
      actorRef.send({ drop: null, type: "OVER" });
    });
    expect(indicators()).toEqual([first]);
    expect(first.dataset.idle).toBe("true");
    expect(first.style.getPropertyValue("--dashfoo-dock-left")).toBe("20px");

    act(() => {
      actorRef.send({ type: "CANCEL" });
    });
    expect(indicators()).toHaveLength(0);
  });
});

const draggableIds = (manager: DragContextValue["manager"]): Array<unknown> =>
  [...manager.registry.draggables].map((source) => JSON.parse(String(source.id)));

const labelOf = (manager: DragContextValue["manager"], tabsetId: string, handle: string) =>
  [...manager.registry.draggables].find((source) => {
    const [, kind, id, part]: Array<unknown> = JSON.parse(String(source.id));

    return kind === "tabset" && id === tabsetId && part === handle;
  })?.data.label;

describe("whole-tabset drag", () => {
  test("the header and the grip both drag the tabset, labeled with the extra tab count", async () => {
    const { manager } = renderLayout(
      model([tabset("ts1", [tab("a"), tab("b"), tab("c")]), tabset("ts2", [tab("d")])]),
    );

    await Promise.resolve();

    expect(labelOf(manager, "ts1", "header")).toBe("A (+2)");
    expect(labelOf(manager, "ts1", "grip")).toBe("A (+2)");
    expect(labelOf(manager, "ts2", "header")).toBe("D");
  });

  test("a tabset with enableDrag off, or holding a tab with it off, can't be dragged whole", async () => {
    const { manager } = renderLayout(
      model([
        tabset("ts1", [tab("a")], false),
        tabset("ts2", [tab("b"), tab("c", false)]),
        tabset("ts3", [tab("d")]),
      ]),
    );

    await Promise.resolve();

    const tabsetIds = draggableIds(manager).flatMap((entry) =>
      Array.isArray(entry) && entry[1] === "tabset" ? [entry[2]] : [],
    );

    expect(new Set(tabsetIds)).toEqual(new Set(["ts3"]));
    expect(document.querySelectorAll('[data-dashfoo="tabset-grip"]')).toHaveLength(1);
  });
});

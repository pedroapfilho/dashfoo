import type { Dashfoo } from "@dashfoo/core";
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createRef } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { DashfooHandle } from "../layout/dashfoo-layout";
import { DashfooLayout } from "../layout/dashfoo-layout";

import { useTabset } from "./tabset-store";

const TAB_WIDTH = 80;
const TABLIST_WIDTH = 300;

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
  global: {},
  layout: {
    children: [
      {
        children: [
          { component: "pane", id: "t1", name: "One", type: "tab" },
          { component: "pane", id: "t2", name: "Two", type: "tab" },
        ],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

const isPart = (element: HTMLElement, part: string): boolean => element.dataset.dashfoo === part;

/** jsdom has no layout: tabs are TAB_WIDTH wide, side by side, in a TABLIST_WIDTH tablist. */
const fakeLayout = (): void => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function clientWidth(
    this: HTMLElement,
  ) {
    return isPart(this, "tablist") ? TABLIST_WIDTH : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function offsetWidth(
    this: HTMLElement,
  ) {
    return isPart(this, "tab-item") ? TAB_WIDTH : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function offsetLeft(
    this: HTMLElement,
  ) {
    const siblings = [...(this.parentElement?.children ?? [])].filter(
      (sibling) => sibling instanceof HTMLElement && isPart(sibling, "tab-item"),
    );

    return Math.max(0, siblings.indexOf(this)) * TAB_WIDTH;
  });
};

const SpaceReadout = (): ReactNode => {
  const space = useTabset((state) => state.tablistSpace);

  return <output>{`space ${space}`}</output>;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tablist space", () => {
  test("is published to the tabset store, the handle, subscribers and a custom property", () => {
    fakeLayout();
    const ref = createRef<DashfooHandle>();
    render(
      <DashfooLayout
        components={{ pane: () => <p>pane</p> }}
        defaultModel={model()}
        ref={ref}
        renderTabsetToolbar={() => <SpaceReadout />}
      />,
    );

    const tablist = document.querySelector<HTMLElement>('[data-dashfoo="tablist"]');

    expect(screen.getByText("space 140")).toBeInTheDocument();
    expect(ref.current?.getTablistSpace("ts1")).toBe(140);
    expect(tablist?.style.getPropertyValue("--dashfoo-tablist-space")).toBe("140px");

    const listener = vi.fn<(space: number) => void>();
    const unsubscribe = ref.current?.onTablistSpaceChange("ts1", listener);

    act(() => {
      ref.current?.addTab(
        { component: "pane", id: "t3", name: "Three", type: "tab" },
        { targetId: "ts1" },
      );
      ref.current?.addTab(
        { component: "pane", id: "t4", name: "Four", type: "tab" },
        { targetId: "ts1" },
      );
    });

    expect(listener).toHaveBeenLastCalledWith(-20);
    expect(screen.getByText("space -20")).toBeInTheDocument();

    unsubscribe?.();
    act(() => ref.current?.closeTab("t4"));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(ref.current?.getTablistSpace("ts1")).toBe(60);
  });

  test("a closed tabset no longer reports a space", () => {
    fakeLayout();
    const ref = createRef<DashfooHandle>();
    render(
      <DashfooLayout components={{ pane: () => <p>pane</p> }} defaultModel={model()} ref={ref} />,
    );

    act(() => {
      ref.current?.addTab(
        { component: "pane", id: "t3", name: "Three", type: "tab" },
        { location: "split-right", targetId: "ts1" },
      );
    });
    act(() => {
      ref.current?.closeTab("t1");
      ref.current?.closeTab("t2");
    });

    expect(ref.current?.getTablistSpace("ts1")).toBeUndefined();
  });
});

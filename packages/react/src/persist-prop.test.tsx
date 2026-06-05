import type { Dashfoo } from "@dashfoo/core";
import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { DashfooHandle } from "./dashfoo-layout";
import { DashfooLayout } from "./dashfoo-layout";
import { memoryStorageAdapter } from "./persistence";

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "c", id: "t1", name: "Original", type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const components = { c: () => <div>content</div> };

describe("DashfooLayout persist prop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  test("saves changes to storage and reloads them on a fresh mount", () => {
    const storage = memoryStorageAdapter();
    const ref = createRef<DashfooHandle>();
    const first = render(
      <DashfooLayout
        components={components}
        defaultModel={model()}
        persist={{ key: "k", storage }}
        ref={ref}
      />,
    );
    expect(screen.getAllByText("Original").length).toBeGreaterThan(0);

    act(() => {
      ref.current?.renameTab("t1", "Renamed");
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(storage.getItem("k")).toContain("Renamed");

    first.unmount();
    render(
      <DashfooLayout
        components={components}
        defaultModel={model()}
        persist={{ key: "k", storage }}
      />,
    );
    expect(screen.getAllByText("Renamed").length).toBeGreaterThan(0);
  });

  test("resetLayout clears storage and restores the default model", () => {
    const storage = memoryStorageAdapter();
    storage.setItem("k", JSON.stringify(model()).replace("Original", "Stale"));
    const ref = createRef<DashfooHandle>();
    render(
      <DashfooLayout
        components={components}
        defaultModel={model()}
        persist={{ key: "k", storage }}
        ref={ref}
      />,
    );
    expect(screen.getAllByText("Stale").length).toBeGreaterThan(0);

    act(() => {
      ref.current?.resetLayout();
    });
    expect(screen.getAllByText("Original").length).toBeGreaterThan(0);
    expect(storage.getItem("k")).toBeNull();
  });
});

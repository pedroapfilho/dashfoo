import type { Dashfoo } from "@dashfoo/core";
import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";

import type { DashfooHandle } from "./dashfoo-layout";
import { DashfooLayout } from "./dashfoo-layout";

const twoPaneModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "chart", id: "t1", name: "Chart", type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
      },
      {
        children: [{ component: "trades", id: "t3", name: "Trades", type: "tab" }],
        id: "ts2",
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

const components = {
  chart: () => <div>CHART</div>,
  trades: () => <div>TRADES</div>,
};

describe("row resize-group reconciliation", () => {
  test("removing a tabset from a multi-pane row does not loop on remount", () => {
    const ref = createRef<DashfooHandle>();
    render(<DashfooLayout components={components} defaultModel={twoPaneModel()} ref={ref} />);

    expect(screen.getByText("TRADES")).toBeInTheDocument();

    act(() => ref.current?.closeTab("t3"));

    expect(screen.getByText("CHART")).toBeInTheDocument();
    expect(screen.queryByText("TRADES")).not.toBeInTheDocument();
  });
});

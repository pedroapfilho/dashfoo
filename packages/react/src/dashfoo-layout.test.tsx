import type { Dashfoo } from "@dashfoo/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { DashfooLayout } from "./dashfoo-layout";

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
  layout: {
    children: [
      {
        children: [
          { component: "chart", id: "t1", name: "Chart", type: "tab" },
          { component: "book", id: "t2", name: "Book", type: "tab" },
        ],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 60,
      },
      {
        children: [{ component: "trades", id: "t3", name: "Trades", type: "tab" }],
        id: "ts2",
        selected: 0,
        type: "tabset",
        weight: 40,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const components = {
  book: () => <div>BOOK</div>,
  chart: () => <div>CHART</div>,
  trades: () => <div>TRADES</div>,
};

describe("DashfooLayout", () => {
  test("renders a tab strip and the active tab content for each tabset", () => {
    render(<DashfooLayout components={components} defaultModel={model()} />);

    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Trades" })).toBeInTheDocument();
    expect(screen.getByText("CHART")).toBeInTheDocument();
    expect(screen.getByText("TRADES")).toBeInTheDocument();
    expect(screen.queryByText("BOOK")).not.toBeInTheDocument();
  });

  test("clicking a tab selects it and swaps the visible content", () => {
    render(<DashfooLayout components={components} defaultModel={model()} />);

    fireEvent.click(screen.getByRole("tab", { name: "Book" }));

    expect(screen.getByText("BOOK")).toBeInTheDocument();
    expect(screen.queryByText("CHART")).not.toBeInTheDocument();
  });

  test("resolves content through a factory when provided", () => {
    render(
      <DashfooLayout defaultModel={model()} factory={(tab) => <div>{`F:${tab.component}`}</div>} />,
    );

    expect(screen.getByText("F:chart")).toBeInTheDocument();
  });

  test("renders resizable panels with a splitter between sibling regions", () => {
    const { container } = render(<DashfooLayout components={components} defaultModel={model()} />);

    expect(container.querySelectorAll("[data-panel]").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[data-dashfoo="splitter"]')).toBeInTheDocument();
  });
});

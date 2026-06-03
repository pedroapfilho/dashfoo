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
};

describe("inactive-tab keep-alive", () => {
  test("keepMounted renders inactive panels (hidden) so their state survives", () => {
    render(<DashfooLayout components={components} defaultModel={model()} keepMounted />);

    expect(screen.getByText("CHART")).toBeVisible();
    const book = screen.getByText("BOOK");
    expect(book).toBeInTheDocument();
    expect(book.closest('[data-dashfoo="tabcontent"]')).not.toBeVisible();
  });

  test("without keepMounted the inactive tab is unmounted", () => {
    render(<DashfooLayout components={components} defaultModel={model()} />);

    expect(screen.getByText("CHART")).toBeInTheDocument();
    expect(screen.queryByText("BOOK")).not.toBeInTheDocument();
  });

  test("switching tabs keeps the previously active panel mounted", () => {
    render(<DashfooLayout components={components} defaultModel={model()} keepMounted />);

    fireEvent.click(screen.getByRole("tab", { name: "Book" }));

    expect(screen.getByText("BOOK")).toBeVisible();
    expect(screen.getByText("CHART")).toBeInTheDocument(); // still mounted, hidden
    expect(screen.getByText("CHART").closest('[data-dashfoo="tabcontent"]')).not.toBeVisible();
  });
});

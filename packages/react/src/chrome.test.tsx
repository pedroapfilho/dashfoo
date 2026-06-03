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

const renderLayout = (props?: Partial<Parameters<typeof DashfooLayout>[0]>) =>
  render(<DashfooLayout components={components} defaultModel={model()} {...props} />);

describe("tab close", () => {
  test("each tab has a close button that removes the tab without selecting it", () => {
    renderLayout();

    // Chart (index 0) is selected; closing the non-active Book must not switch to it.
    fireEvent.click(screen.getByRole("button", { name: "Close Book" }));

    expect(screen.queryByRole("tab", { name: "Book" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
    expect(screen.getByText("CHART")).toBeInTheDocument();
    expect(screen.queryByText("BOOK")).not.toBeInTheDocument();
  });

  test("closable tabs can be suppressed for the whole layout", () => {
    renderLayout({ closableTabs: false });

    expect(screen.queryByRole("button", { name: "Close Chart" })).not.toBeInTheDocument();
  });
});

describe("tab rename", () => {
  test("double-clicking a tab opens an inline editor that commits on Enter", () => {
    renderLayout();

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Chart" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Candles" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByRole("tab", { name: "Candles" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Chart" })).not.toBeInTheDocument();
  });

  test("Escape cancels the rename and keeps the original name", () => {
    renderLayout();

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Chart" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Candles" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Candles" })).not.toBeInTheDocument();
  });

  test("an empty name is rejected (keeps the original)", () => {
    renderLayout();

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Chart" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
  });

  test("rename can be suppressed for the whole layout", () => {
    renderLayout({ renamableTabs: false });

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Chart" }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("tab keyboard navigation (WAI-ARIA Tabs)", () => {
  test("only the selected tab is tabbable, and arrows move and select", () => {
    renderLayout();

    expect(screen.getByRole("tab", { name: "Chart" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Book" })).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Chart" }), { key: "ArrowRight" });

    expect(screen.getByText("BOOK")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Book" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Chart" })).toHaveAttribute("tabindex", "-1");
  });

  test("each tab is wired to its panel via aria-controls / aria-labelledby", () => {
    renderLayout();

    const chart = screen.getByRole("tab", { name: "Chart" });
    const controls = chart.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    const panel = controls ? document.querySelector(`#${controls}`) : null;
    expect(panel).toHaveAttribute("aria-labelledby", chart.getAttribute("id"));
    expect(panel).toHaveAttribute("tabindex", "0");
  });
});

describe("tabset maximize", () => {
  test("maximizing a tabset hides the others; restore brings them back", () => {
    renderLayout();
    expect(screen.getByRole("tab", { name: "Trades" })).toBeInTheDocument();

    // first tabset's maximize button
    fireEvent.click(screen.getAllByRole("button", { name: "Maximize" })[0]);

    expect(screen.queryByRole("tab", { name: "Trades" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    expect(screen.getByRole("tab", { name: "Trades" })).toBeInTheDocument();
  });

  test("maximize can be suppressed for the whole layout", () => {
    renderLayout({ maximizable: false });

    expect(screen.queryByRole("button", { name: "Maximize" })).not.toBeInTheDocument();
  });
});

describe("global attribute defaults", () => {
  const withGlobal = (global: Dashfoo["global"]): Dashfoo => ({ ...model(), global });

  test("tabSetEnableTabStrip: false hides the strip but keeps content", () => {
    render(
      <DashfooLayout
        components={components}
        defaultModel={withGlobal({ tabSetEnableTabStrip: false })}
      />,
    );

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("CHART")).toBeInTheDocument();
  });

  test("global tabEnableClose: false removes every close button", () => {
    render(
      <DashfooLayout
        components={components}
        defaultModel={withGlobal({ tabEnableClose: false })}
      />,
    );

    expect(screen.queryByRole("button", { name: "Close Chart" })).not.toBeInTheDocument();
  });

  test("tabLocation: bottom tags the tabset for theming", () => {
    const { container } = render(
      <DashfooLayout
        components={components}
        defaultModel={withGlobal({ tabLocation: "bottom" })}
      />,
    );

    expect(
      container.querySelector('[data-dashfoo="tabset"][data-tab-location="bottom"]'),
    ).toBeInTheDocument();
  });
});

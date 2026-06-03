import type { Dashfoo } from "@dashfoo/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { DashfooLayout } from "./dashfoo-layout";

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  borders: [
    {
      children: [
        { component: "nav", id: "b1", name: "Files", type: "tab" },
        { component: "outline", id: "b2", name: "Outline", type: "tab" },
      ],
      edge: "left",
      selected: -1,
      type: "border",
    },
  ],
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "chart", id: "t1", name: "Chart", type: "tab" }],
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
  chart: () => <div>CHART</div>,
  nav: () => <div>FILES PANEL</div>,
  outline: () => <div>OUTLINE PANEL</div>,
};

const renderLayout = () => render(<DashfooLayout components={components} defaultModel={model()} />);

describe("border panels", () => {
  test("a border renders a strip of buttons and no drawer until one is selected", () => {
    renderLayout();

    expect(screen.getByRole("button", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outline" })).toBeInTheDocument();
    expect(screen.queryByText("FILES PANEL")).not.toBeInTheDocument();
  });

  test("clicking a border tab opens its drawer; clicking it again collapses it", () => {
    renderLayout();

    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    expect(screen.getByText("FILES PANEL")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    expect(screen.queryByText("FILES PANEL")).not.toBeInTheDocument();
  });

  test("selecting a different border tab swaps the drawer content", () => {
    renderLayout();

    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    expect(screen.getByText("FILES PANEL")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Outline" }));
    expect(screen.getByText("OUTLINE PANEL")).toBeInTheDocument();
    expect(screen.queryByText("FILES PANEL")).not.toBeInTheDocument();
  });
});

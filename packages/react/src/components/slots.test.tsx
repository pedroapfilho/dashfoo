import type { Dashfoo } from "@dashfoo/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { DashfooLayout } from "./dashfoo-layout";

const model = (): Dashfoo => ({
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
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const components = { chart: () => <div>CHART</div> };

describe("render slots", () => {
  test("renderTabLabel customizes the label; the accessible name stays the plain name", () => {
    render(
      <DashfooLayout
        components={components}
        defaultModel={model()}
        renderTabLabel={(tab) => <span>{`L:${tab.name}`}</span>}
      />,
    );

    expect(screen.getByText("L:Chart")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
  });

  test("renderTabsetToolbar renders into the tabset toolbar", () => {
    render(
      <DashfooLayout
        components={components}
        defaultModel={model()}
        renderTabsetToolbar={(tabset) => <button type="button">{`extra-${tabset.id}`}</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "extra-ts1" })).toBeInTheDocument();
  });
});

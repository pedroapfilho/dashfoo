import type { Dashfoo } from "@dashfoo/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { DashfooLayout } from "../layout/dashfoo-layout";

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
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

const components = {
  book: () => <div>BOOK</div>,
  chart: () => <div>CHART</div>,
};

const Counter = (): ReactNode => {
  const [count, setCount] = useState(0);

  return (
    <button
      onClick={() => {
        setCount(count + 1);
      }}
      type="button"
    >
      {`count ${count}`}
    </button>
  );
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
    expect(screen.getByText("CHART")).toBeInTheDocument();
    expect(screen.getByText("CHART").closest('[data-dashfoo="tabcontent"]')).not.toBeVisible();
  });

  test("without keepMounted, two tabs of one component do not share its state", () => {
    const sameComponent = model();
    const [tabset] = sameComponent.layout.children;

    if (tabset?.type !== "tabset") {
      throw new Error("fixture lost its tabset");
    }

    for (const tab of tabset.children) {
      tab.component = "counter";
    }

    render(<DashfooLayout components={{ counter: Counter }} defaultModel={sameComponent} />);

    fireEvent.click(screen.getByRole("button", { name: "count 0" }));
    expect(screen.getByRole("button", { name: "count 1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Book" }));

    expect(screen.getByRole("button", { name: "count 0" })).toBeInTheDocument();
  });

  test('keepMounted="activity" keeps state but pauses the hidden tab\'s effects', () => {
    const effects = vi.fn<(event: string) => void>();

    const Watched = (): ReactNode => {
      useEffect(() => {
        effects("mount");

        return () => {
          effects("cleanup");
        };
      }, []);

      return <Counter />;
    };

    render(
      <DashfooLayout
        components={{ book: () => <div>BOOK</div>, chart: Watched }}
        defaultModel={model()}
        keepMounted="activity"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "count 0" }));
    fireEvent.click(screen.getByRole("tab", { name: "Book" }));

    expect(effects.mock.calls.at(-1)).toEqual(["cleanup"]);
    expect(screen.getByText("BOOK")).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Chart" }));

    expect(effects.mock.calls.at(-1)).toEqual(["mount"]);
    expect(screen.getByRole("button", { name: "count 1" })).toBeVisible();
  });

  test("the server renders the selected tab's content, and no hidden Activity content", () => {
    const html = renderToString(
      <DashfooLayout components={components} defaultModel={model()} keepMounted="activity" />,
    );

    expect(html).toContain("CHART");
    expect(html).not.toContain("BOOK");
  });
});

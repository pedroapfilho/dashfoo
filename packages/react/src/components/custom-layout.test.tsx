import type { Dashfoo, TabNode, TabsetNode } from "@dashfoo/core";
import { findTabset } from "@dashfoo/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";

import { useDashfooStore } from "../hooks/store";

import { Layout } from "./layout";
import { Tabset } from "./tabset/tabset";
import { useTab, useTabset } from "./tabset/tabset-store";

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
    weight: 1,
  },
  version: 1,
});

const nestedModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "chart", id: "t1", name: "Chart", type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 50,
      },
      {
        children: [
          {
            children: [{ component: "book", id: "t2", name: "Book", type: "tab" }],
            id: "ts2",
            selected: 0,
            type: "tabset",
            weight: 50,
          },
          {
            children: [{ component: "trades", id: "t3", name: "Trades", type: "tab" }],
            id: "ts3",
            selected: 0,
            type: "tabset",
            weight: 50,
          },
        ],
        id: "row2",
        orientation: "column",
        type: "row",
        weight: 50,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

const CONTENT: Record<string, string> = { book: "BOOK", chart: "CHART", trades: "TRADES" };

const renderTabContent = (tab: TabNode): ReactNode => <div>{CONTENT[tab.component]}</div>;

const CustomLabel = (): ReactNode => {
  const { index, tab } = useTab();
  const selected = useTabset((state) => state.visualSelected === index);
  return (
    <span data-testid={`label-${tab.id}`}>
      {tab.name}
      {selected ? " *" : ""}
    </span>
  );
};

const CustomTabset = ({ node }: { node: TabsetNode }): ReactNode => (
  <Tabset.Root data-testid={`custom-${node.id}`} node={node}>
    <Tabset.TabStrip>
      <Tabset.Tablist>
        {node.children.map((tab) => (
          <Tabset.Tab key={tab.id} tab={tab}>
            <Tabset.Trigger>
              <CustomLabel />
            </Tabset.Trigger>
            <Tabset.RenameInput />
            <Tabset.CloseButton />
          </Tabset.Tab>
        ))}
      </Tabset.Tablist>
      <Tabset.Toolbar>
        <Tabset.MaximizeButton />
      </Tabset.Toolbar>
    </Tabset.TabStrip>
    <Tabset.Content />
  </Tabset.Root>
);

const CustomLayout = ({
  defaultModel,
  withDrag = false,
}: {
  defaultModel: Dashfoo;
  withDrag?: boolean;
}): ReactNode => {
  const store = useDashfooStore({ defaultModel });
  const maximized =
    store.model.maximizedTabsetId === undefined
      ? undefined
      : findTabset(store.model, store.model.maximizedTabsetId);
  const tree = maximized ? (
    <Layout.Tabset node={maximized} />
  ) : (
    <Layout.Rows node={store.model.layout} renderTabset={(node) => <CustomTabset node={node} />} />
  );
  return (
    <Layout.Root dispatch={store.dispatch} model={store.model} renderTab={renderTabContent}>
      {withDrag ? <Layout.DragLayer>{tree}</Layout.DragLayer> : tree}
    </Layout.Root>
  );
};

describe("hand-composed layout from primitives", () => {
  test("renders the custom composition with working selection — without a DragLayer", () => {
    render(<CustomLayout defaultModel={model()} />);

    expect(screen.getByText("CHART")).toBeInTheDocument();
    expect(screen.getByTestId("label-t1")).toHaveTextContent("Chart *");

    fireEvent.click(screen.getByRole("tab", { name: "Book" }));

    expect(screen.getByText("BOOK")).toBeInTheDocument();
    expect(screen.getByTestId("label-t2")).toHaveTextContent("Book *");
  });

  test("renders under a DragLayer with the structural drag attributes intact", () => {
    const { container } = render(<CustomLayout defaultModel={model()} withDrag />);

    expect(container.querySelector('[data-dashfoo="tabstrip"]')).toBeInTheDocument();
    expect(container.querySelector('[data-dashfoo="tab"][data-tab-id="t1"]')).toBeInTheDocument();
    expect(container.querySelector('[data-dashfoo="tabset"]')).toBeInTheDocument();
  });

  test("renderTabset reaches every leaf of a nested split tree", () => {
    render(<CustomLayout defaultModel={nestedModel()} />);

    expect(screen.getByTestId("custom-ts1")).toBeInTheDocument();
    expect(screen.getByTestId("custom-ts2")).toBeInTheDocument();
    expect(screen.getByTestId("custom-ts3")).toBeInTheDocument();
  });

  test("closing a tab restores focus to the newly-selected tab", () => {
    render(<CustomLayout defaultModel={model()} />);

    fireEvent.click(screen.getByRole("button", { name: "Close Chart" }));

    const remaining = screen.getByRole("tab", { name: "Book *" });
    expect(remaining).toHaveFocus();
    expect(screen.getByText("BOOK")).toBeInTheDocument();
  });

  test("arrow keys move and select with roving tabindex", () => {
    render(<CustomLayout defaultModel={model()} />);

    const chart = screen.getByRole("tab", { name: "Chart *" });
    expect(chart).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(chart, { key: "ArrowRight" });

    expect(screen.getByText("BOOK")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Book *" })).toHaveFocus();
  });

  test("rename via double-click commits and returns focus to the trigger", () => {
    render(<CustomLayout defaultModel={model()} />);

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Chart *" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Candles" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const renamed = screen.getByRole("tab", { name: "Candles *" });
    expect(renamed).toBeInTheDocument();
    expect(renamed).toHaveFocus();
  });

  test("maximize hands the leaf to the host, which swaps in the stock Layout.Tabset", () => {
    render(<CustomLayout defaultModel={model()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Maximize" })[0]);

    expect(screen.queryByRole("tab", { name: "Trades" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
  });
});

describe("misuse", () => {
  test("Tabset parts outside Tabset.Root throw", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Tabset.Tablist />)).toThrow(
      "dashfoo Tabset parts must be rendered inside <Tabset.Root>.",
    );
    vi.restoreAllMocks();
  });

  test("a second Tablist under one Root warns and the last one wins", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const node = model().layout.children[0] as TabsetNode;

    const TwoTablists = (): ReactNode => {
      const store = useDashfooStore({ defaultModel: model() });
      return (
        <Layout.Root dispatch={store.dispatch} model={store.model} renderTab={renderTabContent}>
          <Tabset.Root node={node}>
            <Tabset.Tablist data-testid="first" />
            <Tabset.Tablist data-testid="second" />
          </Tabset.Root>
        </Layout.Root>
      );
    };
    render(<TwoTablists />);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("more than one <Tabset.Tablist>"));
    vi.restoreAllMocks();
  });

  test("a Tab that is not part of the tabset node warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const node = model().layout.children[0] as TabsetNode;
    const ghost: TabNode = { component: "chart", id: "ghost", name: "Ghost", type: "tab" };

    const OrphanTab = (): ReactNode => {
      const store = useDashfooStore({ defaultModel: model() });
      return (
        <Layout.Root dispatch={store.dispatch} model={store.model} renderTab={renderTabContent}>
          <Tabset.Root node={node}>
            <Tabset.Tablist>
              <Tabset.Tab tab={ghost}>
                <Tabset.Trigger />
              </Tabset.Tab>
            </Tabset.Tablist>
          </Tabset.Root>
        </Layout.Root>
      );
    };
    render(<OrphanTab />);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not a child"));
    expect(screen.getByRole("tab", { name: "Ghost" })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  test("moving a tab between tabsets does not emit a false orphan warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const MovableLayout = (): ReactNode => {
      const store = useDashfooStore({ defaultModel: model() });
      const handleMove = (): void => {
        store.dispatch({ location: "center", sourceId: "t1", targetId: "ts2", type: "moveNode" });
      };
      return (
        <Layout.Root dispatch={store.dispatch} model={store.model} renderTab={renderTabContent}>
          <button onClick={handleMove} type="button">
            move chart
          </button>
          <Layout.Rows
            node={store.model.layout}
            renderTabset={(node) => <CustomTabset node={node} />}
          />
        </Layout.Root>
      );
    };
    render(<MovableLayout />);

    fireEvent.click(screen.getByRole("button", { name: "move chart" }));

    expect(within(screen.getByTestId("custom-ts2")).getByTestId("label-t1")).toBeInTheDocument();
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("not a child"));
    vi.restoreAllMocks();
  });
});

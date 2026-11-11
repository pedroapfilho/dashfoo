import type { Action, Dashfoo, TabsetNode } from "@dashfoo/core";
import { findTabset, model, row, tab, tabset } from "@dashfoo/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";

import { keepCollapsedWeights } from "../layout/collapse-geometry";
import { DashfooLayout } from "../layout/dashfoo-layout";
import { Layout } from "../layout/layout";
import { useDashfooStore } from "../store/store";

import { Tabset } from "./tabset";

const editorWithPanel = (panel: { collapsed?: boolean; collapsible?: boolean } = {}): Dashfoo =>
  model(
    row(
      [
        tabset([tab("editor", "Editor")], { id: "main", weight: 3 }),
        tabset([tab("term", "Terminal"), tab("logs", "Logs")], {
          collapsible: true,
          id: "bottom",
          ...panel,
        }),
      ],
      { id: "root", orientation: "column" },
    ),
  );

const components = {
  editor: () => <div>EDITOR</div>,
  logs: () => <div>LOGS</div>,
  term: () => <div>TERM</div>,
};

const renderLayout = (defaultModel: Dashfoo) => {
  const changes: Array<{ action?: Action; model: Dashfoo }> = [];

  render(
    <DashfooLayout
      components={components}
      defaultModel={defaultModel}
      onModelChange={(next, action) => {
        changes.push({ action, model: next });
      }}
    />,
  );

  return changes;
};

const bottomOf = (changes: Array<{ model: Dashfoo }>): TabsetNode | undefined => {
  const last = changes.at(-1);

  return last && findTabset(last.model, "bottom");
};

const tabsetElement = (id: string): HTMLElement | null =>
  document.querySelector(`[data-tabset-id="${id}"]`);

describe("Tabset.CollapseButton", () => {
  test("collapses the tabset to its strip and reports the action", () => {
    const changes = renderLayout(editorWithPanel());
    const button = screen.getByRole("button", { name: "Collapse" });

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", screen.getByText("TERM").parentElement?.id);

    fireEvent.click(button);

    expect(changes.at(-1)?.action).toEqual({
      collapsed: true,
      tabsetId: "bottom",
      type: "setTabsetCollapsed",
    });
    expect(bottomOf(changes)?.collapsed).toBe(true);
    expect(tabsetElement("bottom")).toHaveAttribute("data-collapsed", "column");
    expect(screen.getByRole("button", { name: "Expand" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("expands a collapsed tabset", () => {
    const changes = renderLayout(editorWithPanel({ collapsed: true }));

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));

    expect(bottomOf(changes)?.collapsed).toBeUndefined();
    expect(tabsetElement("bottom")).not.toHaveAttribute("data-collapsed");
  });

  test("clicking a tab of a collapsed tabset expands it", () => {
    const changes = renderLayout(editorWithPanel({ collapsed: true }));

    fireEvent.click(screen.getByRole("tab", { name: "Logs" }));

    expect(bottomOf(changes)).toMatchObject({ collapsed: undefined, selected: 1 });
  });

  test("renders nothing for a tabset that is not collapsible", () => {
    renderLayout(editorWithPanel({ collapsible: false }));

    expect(screen.queryByRole("button", { name: "Collapse" })).not.toBeInTheDocument();
  });

  test("renders nothing when collapsing would leave the split without an expanded child", () => {
    render(
      <DashfooLayout
        components={components}
        defaultModel={model(
          row([
            tabset([tab("editor", "Editor")], { collapsed: true, collapsible: true, id: "a" }),
            tabset([tab("term", "Terminal")], { collapsible: true, id: "b" }),
          ]),
        )}
      />,
    );

    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse" })).not.toBeInTheDocument();
  });

  test("children, className and title can be functions of the collapsed state", () => {
    render(
      <DashfooLayout
        components={components}
        defaultModel={editorWithPanel({ collapsed: true })}
        renderTabsetToolbar={() => (
          <Tabset.CollapseButton
            className={({ isCollapsed }) => (isCollapsed ? "closed" : "open")}
            title={({ isCollapsed }) => (isCollapsed ? "Show panel" : "Hide panel")}
          >
            {({ isCollapsed }) => (isCollapsed ? "▸" : "▾")}
          </Tabset.CollapseButton>
        )}
      />,
    );

    const custom = screen.getByTitle("Show panel");

    expect(custom).toHaveTextContent("▸");
    expect(custom).toHaveClass("closed");
  });
});

describe("Tabset.MaximizeButton", () => {
  test("renders nothing for the only tabset in the layout", () => {
    render(
      <DashfooLayout
        components={components}
        defaultModel={model(row([tabset([tab("editor", "Editor")])]))}
      />,
    );

    expect(screen.queryByRole("button", { name: "Maximize" })).not.toBeInTheDocument();
  });

  test("children can be a function of the maximized state", () => {
    render(
      <DashfooLayout
        components={components}
        defaultModel={editorWithPanel()}
        renderTabsetToolbar={(node) =>
          node.id === "main" ? (
            <Tabset.MaximizeButton title="Zoom">
              {({ isMaximized }) => (isMaximized ? "restore" : "zoom")}
            </Tabset.MaximizeButton>
          ) : null
        }
      />,
    );

    fireEvent.click(screen.getByTitle("Zoom"));

    expect(screen.getByTitle("Zoom")).toHaveTextContent("restore");
    expect(screen.getByTitle("Zoom")).toHaveAttribute("aria-pressed", "true");
  });
});

const ClosableLayout = (): ReactNode => {
  const store = useDashfooStore({ defaultModel: editorWithPanel() });

  return (
    <Layout.Root dispatch={store.dispatch} model={store.model} renderers={{ tab: () => null }}>
      <Layout.Rows
        node={store.model.layout}
        renderTabset={(node) => (
          <Tabset.Root node={node}>
            <Tabset.Tablist>
              {node.children.map((child) => (
                <Tabset.Tab key={child.id} tab={child}>
                  <Tabset.Trigger />
                  <Tabset.CloseButton
                    className={({ isSelected, tab: owner }) =>
                      `${owner.id}-${isSelected ? "selected" : "idle"}`
                    }
                  />
                </Tabset.Tab>
              ))}
            </Tabset.Tablist>
          </Tabset.Root>
        )}
      />
    </Layout.Root>
  );
};

describe("Tabset.CloseButton", () => {
  test("className is a function of the tab and whether it is selected", () => {
    render(<ClosableLayout />);

    expect(screen.getByRole("button", { name: "Close Terminal" })).toHaveClass("term-selected");
    expect(screen.getByRole("button", { name: "Close Logs" })).toHaveClass("logs-idle");
  });
});

describe("keepCollapsedWeights", () => {
  test("keeps a collapsed child's weight and rescales the rest into their old units", () => {
    const node = row(
      [
        tabset([tab("a", "A")], { id: "a", weight: 2 }),
        tabset([tab("b", "B")], { id: "b", weight: 1 }),
        tabset([tab("c", "C")], { collapsed: true, collapsible: true, id: "c", weight: 1 }),
      ],
      { id: "r" },
    );

    expect(keepCollapsedWeights(node, [45, 45, 10], new Set(["c"]))).toEqual([1.5, 1.5, 1]);
  });

  test("passes sizes through when nothing is collapsed", () => {
    const node = row([tabset([tab("a", "A")], { id: "a" }), tabset([tab("b", "B")], { id: "b" })]);

    expect(keepCollapsedWeights(node, [30, 70], new Set())).toEqual([30, 70]);
  });
});

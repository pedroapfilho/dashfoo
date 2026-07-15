import type { Dashfoo } from "@dashfoo/core";
import type { DragDropManager } from "@dnd-kit/dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createRef, useContext, useEffect } from "react";
import { describe, expect, test } from "vitest";

import { SharedDragManagerContext } from "../hooks/drag-hooks";

import type { DashfooHandle, DashfooLayoutProps } from "./dashfoo-layout";
import { DashfooLayout } from "./dashfoo-layout";
import { DashfooDragProvider } from "./drag-root";

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

const renderLayout = (props?: Partial<DashfooLayoutProps>) =>
  render(<DashfooLayout components={components} defaultModel={model()} {...props} />);

const splitterOf = (container: HTMLElement): HTMLElement | null =>
  container.querySelector<HTMLElement>('[data-dashfoo="splitter"]');

const flushRegistrations = () => Promise.resolve();

const ManagerProbe = ({
  children,
  onManager,
}: {
  children: ReactNode;
  onManager: (manager: DragDropManager | null) => void;
}): ReactNode => {
  const manager = useContext(SharedDragManagerContext);
  useEffect(() => {
    onManager(manager);
  });
  return children;
};

const renderWithManager = (props?: Partial<DashfooLayoutProps>) => {
  let manager: DragDropManager | null = null;
  const capture = (value: DragDropManager | null): void => {
    manager = value;
  };
  const tree = (overrides?: Partial<DashfooLayoutProps>): ReactNode => (
    <DashfooDragProvider>
      <ManagerProbe onManager={capture}>
        <DashfooLayout components={components} defaultModel={model()} {...props} {...overrides} />
      </ManagerProbe>
    </DashfooDragProvider>
  );
  const view = render(tree());
  return {
    manager: (): DragDropManager => manager!,
    rerender: (overrides?: Partial<DashfooLayoutProps>): void => {
      view.rerender(tree(overrides));
    },
    view,
  };
};

describe("editable={false} renders a static layout", () => {
  test("removes close buttons, grips, and the rename editor", () => {
    renderLayout({ editable: false });

    expect(screen.queryByRole("button", { name: /^Close/v })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move tabset" })).not.toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Chart" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("keeps tab selection working", () => {
    renderLayout({ editable: false });

    fireEvent.click(screen.getByRole("tab", { name: "Book" }));

    expect(screen.getByText("BOOK")).toBeInTheDocument();
  });

  test("keeps maximize working — it is view state, not a structural edit", () => {
    renderLayout({ editable: false });

    fireEvent.click(screen.getAllByRole("button", { name: "Maximize" })[0]);
    expect(screen.queryByRole("tab", { name: "Trades" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.getByRole("tab", { name: "Trades" })).toBeInTheDocument();
  });

  test("disables the splitter but keeps it mounted so the gutter cannot collapse", () => {
    const { container } = renderLayout({ editable: false });

    const splitter = splitterOf(container);
    expect(splitter).toBeInTheDocument();
    expect(splitter).toHaveAttribute("data-separator", "disabled");
  });

  test("registers no draggables at all", async () => {
    const { manager } = renderWithManager({ editable: false });
    await flushRegistrations();

    expect([...manager().registry.draggables]).toHaveLength(0);
  });

  test("the imperative ref API still mutates the model", () => {
    const ref = createRef<DashfooHandle>();
    render(
      <DashfooLayout components={components} defaultModel={model()} editable={false} ref={ref} />,
    );

    act(() => ref.current?.closeTab("t2"));

    expect(screen.queryByRole("tab", { name: "Book" })).not.toBeInTheDocument();
  });
});

describe("resizableSplits", () => {
  test("prop false disables the splitter while the rest of the chrome stays", () => {
    const { container } = renderLayout({ resizableSplits: false });

    expect(splitterOf(container)).toHaveAttribute("data-separator", "disabled");
    expect(screen.getByRole("button", { name: "Close Chart" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Move tabset" })).not.toHaveLength(0);
  });

  test("global enableSplitResize: false disables the splitter", () => {
    const { container } = renderLayout({
      defaultModel: { ...model(), global: { enableSplitResize: false } },
    });

    expect(splitterOf(container)).toHaveAttribute("data-separator", "disabled");
  });

  test("splitters are enabled by default", () => {
    const { container } = renderLayout();

    expect(splitterOf(container)).not.toHaveAttribute("data-separator", "disabled");
  });
});

describe("draggableTabs", () => {
  test("prop false unregisters tab draggables but keeps the tabset grips", async () => {
    const { manager } = renderWithManager({ draggableTabs: false });
    await flushRegistrations();

    const registry = manager().registry.draggables;
    expect(registry.has("t1")).toBe(false);
    expect(registry.has("grip-ts1")).toBe(true);
  });

  test("global tabEnableDrag: false unregisters tab draggables", async () => {
    const { manager } = renderWithManager({
      defaultModel: { ...model(), global: { tabEnableDrag: false } },
    });
    await flushRegistrations();

    expect(manager().registry.draggables.has("t1")).toBe(false);
  });

  test("tabs are draggable by default", async () => {
    const { manager } = renderWithManager();
    await flushRegistrations();

    expect(manager().registry.draggables.has("t1")).toBe(true);
  });
});

describe("runtime toggling", () => {
  test("flipping editable back on restores every affordance without a remount", async () => {
    const { manager, rerender, view } = renderWithManager({ editable: false });
    await flushRegistrations();

    expect(screen.queryByRole("button", { name: "Close Chart" })).not.toBeInTheDocument();
    expect([...manager().registry.draggables]).toHaveLength(0);

    rerender({ editable: true });
    await flushRegistrations();

    expect(screen.getByRole("button", { name: "Close Chart" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Move tabset" })).not.toHaveLength(0);
    expect(splitterOf(view.container)).not.toHaveAttribute("data-separator", "disabled");
    expect(manager().registry.draggables.has("t1")).toBe(true);
  });
});

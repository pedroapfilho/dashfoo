import type { Action, Dashfoo } from "@dashfoo/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";

import type { DashfooHandle } from "./dashfoo-layout";
import { DashfooLayout } from "./dashfoo-layout";

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
      {
        children: [{ component: "trades", id: "t3", name: "Trades", type: "tab" }],
        id: "ts2",
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
  trades: () => <div>TRADES</div>,
};

describe("imperative handle", () => {
  test("exposes getModel + selectTab + undo/redo", () => {
    const ref = createRef<DashfooHandle>();
    render(<DashfooLayout components={components} defaultModel={model()} ref={ref} />);

    expect(ref.current?.getModel().activeTabsetId).toBe("ts1");
    expect(ref.current?.canUndo()).toBe(false);

    act(() => ref.current?.selectTab("ts1", 1));
    expect(screen.getByText("BOOK")).toBeInTheDocument();
    expect(ref.current?.canUndo()).toBe(true);

    act(() => ref.current?.undo());
    expect(screen.getByText("CHART")).toBeInTheDocument();
    expect(ref.current?.canUndo()).toBe(false);
    expect(ref.current?.canRedo()).toBe(true);

    act(() => ref.current?.redo());
    expect(screen.getByText("BOOK")).toBeInTheDocument();
    expect(ref.current?.canRedo()).toBe(false);
  });

  test("closeTab removes a tab via the handle", () => {
    const ref = createRef<DashfooHandle>();
    render(<DashfooLayout components={components} defaultModel={model()} ref={ref} />);

    act(() => ref.current?.closeTab("t2"));

    expect(screen.queryByRole("tab", { name: "Book" })).not.toBeInTheDocument();
  });
});

const vetoDeletes = (action: Action): Action | null =>
  action.type === "deleteTab" ? null : action;

describe("onAction veto", () => {
  test("returning null cancels the action", () => {
    render(<DashfooLayout components={components} defaultModel={model()} onAction={vetoDeletes} />);

    fireEvent.click(screen.getByRole("button", { name: "Close Book" }));

    expect(screen.getByRole("tab", { name: "Book" })).toBeInTheDocument();
  });
});

describe("derived callbacks", () => {
  test("onMaximizedTabsetChange fires when a tabset is maximized and restored", () => {
    const spy = vi.fn<(tabsetId: string | undefined) => void>();
    render(
      <DashfooLayout
        components={components}
        defaultModel={model()}
        onMaximizedTabsetChange={spy}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Maximize" })[0]);
    expect(spy).toHaveBeenLastCalledWith("ts1");

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(spy).toHaveBeenLastCalledWith(undefined);
  });
});

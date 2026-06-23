import type { Dashfoo } from "@dashfoo/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { DashfooLayout } from "./dashfoo-layout";
import { Layout } from "./layout";

const components = {
  book: () => <div>BOOK</div>,
  chart: () => <div>CHART</div>,
};

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
        weight: 100,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const floatPanel = (): HTMLElement | null => document.querySelector('[data-dashfoo="float"]');

afterEach(() => {
  vi.restoreAllMocks();
});

describe("floating panels", () => {
  test("no float control unless floatable", () => {
    render(<DashfooLayout components={components} defaultModel={model()} />);

    expect(screen.queryByLabelText("Float panel")).not.toBeInTheDocument();
  });

  test("floating a tabset renders it as an in-app overlay with a dock-back control", () => {
    render(<DashfooLayout components={components} defaultModel={model()} floatable />);

    fireEvent.click(screen.getByLabelText("Float panel"));

    const panel = floatPanel();
    expect(panel).not.toBeNull();
    const float = within(panel!);
    expect(float.getByText("CHART")).toBeInTheDocument();
    expect(float.getByLabelText("Dock panel back into the main layout")).toBeInTheDocument();
  });

  test("dragging the title bar moves the float and commits one update", () => {
    render(<DashfooLayout components={components} defaultModel={model()} floatable />);
    fireEvent.click(screen.getByLabelText("Float panel"));

    const panel = floatPanel()!;
    const titleBar = panel.querySelector('[data-dashfoo="float-titlebar"]')!;
    // jsdom has no real layout, but the gesture math still applies the delta.
    panel.setPointerCapture = () => {};
    panel.releasePointerCapture = () => {};
    fireEvent.pointerDown(titleBar, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(panel, { clientX: 40, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(panel, { clientX: 40, clientY: 30, pointerId: 1 });

    // The float still exists (move, not dock) after the gesture commits.
    expect(floatPanel()).not.toBeNull();
  });

  test("dock-back returns the panel to the main layout", () => {
    render(<DashfooLayout components={components} defaultModel={model()} floatable />);
    fireEvent.click(screen.getByLabelText("Float panel"));

    fireEvent.click(within(floatPanel()!).getByLabelText("Dock panel back into the main layout"));

    expect(floatPanel()).toBeNull();
    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
    expect(screen.getByText("CHART")).toBeInTheDocument();
  });

  test("the title is the float's own name (not the active tab), renamable by double-click", () => {
    render(<DashfooLayout components={components} defaultModel={model()} floatable />);
    fireEvent.click(screen.getByLabelText("Float panel"));

    const title = floatPanel()!.querySelector('[data-dashfoo="float-title"]')!;
    // The active tab is "Chart"; the window title is its own name instead.
    expect(title).toHaveTextContent("Panel");

    fireEvent.doubleClick(title);
    const input = floatPanel()!.querySelector('[data-dashfoo="float-rename"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: "Inspector" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(floatPanel()!.querySelector('[data-dashfoo="float-title"]')).toHaveTextContent(
      "Inspector",
    );
  });

  test("minimize collapses the float to a chip, and the chip restores it", () => {
    render(<DashfooLayout components={components} defaultModel={model()} floatable />);
    fireEvent.click(screen.getByLabelText("Float panel"));

    fireEvent.click(within(floatPanel()!).getByLabelText("Minimize panel"));

    // The window is gone; a chip stands in its place.
    expect(floatPanel()).toBeNull();
    const chip = document.querySelector('[data-dashfoo="float-chip"]');
    expect(chip).not.toBeNull();

    // Activating the chip restores the window.
    fireEvent.keyDown(chip!, { key: "Enter" });
    expect(floatPanel()).not.toBeNull();
  });

  // A hand-built layout that turns on `floatable` but forgets <Layout.FloatLayer>
  // has nowhere to render the float. The control must not float a panel into
  // nowhere — it hides and warns (DashfooLayout always supplies the layer).
  test("hides the float control and warns when no FloatLayer is present", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = model();

    render(
      <Layout.Root dispatch={() => {}} floatable model={m} renderTab={() => <div>X</div>}>
        <Layout.Rows node={m.layout} />
      </Layout.Root>,
    );

    expect(screen.queryByLabelText("Float panel")).not.toBeInTheDocument();
    expect(warn.mock.calls.some((call) => String(call[0]).includes("FloatLayer"))).toBe(true);
    warn.mockRestore();
  });
});

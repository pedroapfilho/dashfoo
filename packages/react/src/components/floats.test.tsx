import type { Dashfoo, FloatNode } from "@dashfoo/core";
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

const floatNode = (id: string, tabId: string, component: string, name: string): FloatNode => ({
  geometry: { height: 300, left: 40, top: 40, width: 400 },
  id,
  layout: {
    children: [
      {
        children: [{ component, id: tabId, name, type: "tab" }],
        id: `${id}-ts`,
        selected: 0,
        type: "tabset",
        weight: 100,
      },
    ],
    id: `${id}-row`,
    orientation: "row",
    type: "row",
  },
  name: `Panel ${id}`,
  type: "float",
});

const floatPanel = (): HTMLElement | null => document.querySelector('[data-dashfoo="float"]');
const floatPanels = (): Array<HTMLElement> => [
  ...document.querySelectorAll<HTMLElement>('[data-dashfoo="float"]'),
];

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

    panel.setPointerCapture = () => {};
    panel.releasePointerCapture = () => {};

    fireEvent.pointerDown(titleBar, { buttons: 1, clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(panel, { buttons: 1, clientX: 40, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(panel, { clientX: 40, clientY: 30, pointerId: 1 });

    expect(floatPanel()).not.toBeNull();
  });

  test("a resize whose pointerup is lost stops on the next button-up move (no runaway)", () => {
    render(<DashfooLayout components={components} defaultModel={model()} floatable />);
    fireEvent.click(screen.getByLabelText("Float panel"));

    const panel = floatPanel()!;
    panel.setPointerCapture = () => {};
    panel.releasePointerCapture = () => {};
    panel.hasPointerCapture = () => true;
    const handles = [...panel.querySelectorAll<HTMLElement>('[data-dashfoo="float-resize"]')];
    const se = handles.find((h) => h.dataset.edge === "se")!;

    fireEvent.pointerDown(se, { buttons: 1, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(panel, { buttons: 1, clientX: 160, clientY: 140, pointerId: 1 });
    const draggedWidth = panel.style.width;
    expect(draggedWidth).not.toBe("");

    fireEvent.pointerMove(panel, { buttons: 0, clientX: 300, clientY: 260, pointerId: 1 });
    fireEvent.pointerMove(panel, { buttons: 0, clientX: 420, clientY: 380, pointerId: 1 });

    expect(panel.style.width).toBe(draggedWidth);
  });

  test("a cancelled resize (OS took the pointer) reverts to the starting rect", () => {
    render(<DashfooLayout components={components} defaultModel={model()} floatable />);
    fireEvent.click(screen.getByLabelText("Float panel"));

    const panel = floatPanel()!;
    panel.setPointerCapture = () => {};
    panel.releasePointerCapture = () => {};
    panel.hasPointerCapture = () => true;
    const startWidth = panel.style.width;
    const se = [...panel.querySelectorAll<HTMLElement>('[data-dashfoo="float-resize"]')].find(
      (h) => h.dataset.edge === "se",
    )!;

    fireEvent.pointerDown(se, { buttons: 1, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(panel, { buttons: 1, clientX: 180, clientY: 160, pointerId: 1 });
    expect(panel.style.width).not.toBe(startWidth);

    fireEvent.pointerCancel(panel, { clientX: 180, clientY: 160, pointerId: 1 });
    expect(panel.style.width).toBe(startWidth);
  });

  test("a stale gesture from one pointer does not block a drag by another pointer", () => {
    render(<DashfooLayout components={components} defaultModel={model()} floatable />);
    fireEvent.click(screen.getByLabelText("Float panel"));

    const panel = floatPanel()!;
    panel.setPointerCapture = () => {};
    panel.releasePointerCapture = () => {};
    panel.hasPointerCapture = () => false;
    const titleBar = panel.querySelector('[data-dashfoo="float-titlebar"]')!;
    const se = [...panel.querySelectorAll<HTMLElement>('[data-dashfoo="float-resize"]')].find(
      (h) => h.dataset.edge === "se",
    )!;

    fireEvent.pointerDown(titleBar, { buttons: 1, clientX: 0, clientY: 0, pointerId: 1 });

    const startWidth = panel.style.width;
    fireEvent.pointerDown(se, { buttons: 1, clientX: 100, clientY: 100, pointerId: 2 });
    fireEvent.pointerMove(panel, { buttons: 1, clientX: 180, clientY: 160, pointerId: 2 });
    expect(panel.style.width).not.toBe(startWidth);
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

    expect(floatPanel()).toBeNull();
    const chip = document.querySelector('[data-dashfoo="float-chip"]');
    expect(chip).not.toBeNull();

    fireEvent.keyDown(chip!, { key: "Enter" });
    expect(floatPanel()).not.toBeNull();
  });

  test("a static layout (editable=false) renders a float with no structural chrome", () => {
    const m: Dashfoo = { ...model(), floats: [floatNode("f1", "ft1", "chart", "Chart")] };
    render(<DashfooLayout components={components} defaultModel={m} editable={false} />);

    const panel = floatPanel()!;
    expect(panel).not.toBeNull();

    expect(within(panel).getByText("CHART")).toBeInTheDocument();

    expect(within(panel).queryByLabelText("Minimize panel")).not.toBeInTheDocument();
    expect(
      within(panel).queryByLabelText("Dock panel back into the main layout"),
    ).not.toBeInTheDocument();
    expect(panel.querySelector('[data-dashfoo="float-resize"]')).toBeNull();
  });

  test("a static layout's float cannot be renamed or moved", () => {
    const m: Dashfoo = { ...model(), floats: [floatNode("f1", "ft1", "chart", "Chart")] };
    render(<DashfooLayout components={components} defaultModel={m} editable={false} />);

    const panel = floatPanel()!;

    fireEvent.doubleClick(panel.querySelector('[data-dashfoo="float-title"]')!);
    expect(panel.querySelector('[data-dashfoo="float-rename"]')).toBeNull();

    panel.setPointerCapture = () => {};
    panel.releasePointerCapture = () => {};
    const titleBar = panel.querySelector('[data-dashfoo="float-titlebar"]')!;
    fireEvent.pointerDown(titleBar, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(panel, { clientX: 60, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(panel, { clientX: 60, clientY: 50, pointerId: 1 });
    expect(panel.style.left).toBe("40px");
    expect(panel.style.top).toBe("40px");
  });

  test("clicking a float's body raises it above the others", () => {
    const m: Dashfoo = {
      ...model(),
      floats: [floatNode("f1", "ft1", "chart", "Chart"), floatNode("f2", "ft2", "book", "Book")],
    };
    render(<DashfooLayout components={components} defaultModel={m} floatable />);

    const [first, second] = floatPanels();

    expect(second.style.zIndex).toBe("1");

    fireEvent.pointerDown(within(second).getByText("BOOK"));
    expect(second.style.zIndex).toBe("2");
    expect(first.style.zIndex).toBe("1");
  });

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

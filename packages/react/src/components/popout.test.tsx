import type { Dashfoo } from "@dashfoo/core";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { DashfooHandle } from "./dashfoo-layout";
import { DashfooLayout } from "./dashfoo-layout";

// A stand-in for a real popup: createRoot renders into `container` (a node in the
// test document, so React has a real window context and events fire), while the
// rest of the Window surface is stubbed. close() removes the container.
type FakePopup = {
  container: HTMLElement;
  fireClose: () => void;
  window: Window;
};

const makeFakePopup = (): FakePopup => {
  const container = document.createElement("div");
  container.dataset.fakePopup = "";
  document.body.append(container);
  const listeners = new Map<string, () => void>();
  const fakeDocument = {
    body: container,
    documentElement: document.createElement("html"),
    head: document.createElement("head"),
    title: "",
  };
  const win = {
    addEventListener: (type: string, fn: () => void) => listeners.set(type, fn),
    close: () => {
      win.closed = true;
      container.remove();
    },
    closed: false,
    document: fakeDocument,
    removeEventListener: (type: string) => listeners.delete(type),
    screenX: 0,
    screenY: 0,
  };
  return {
    container,
    fireClose: () => listeners.get("pagehide")?.(),
    window: win as unknown as Window,
  };
};

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

afterEach(() => {
  document.querySelectorAll("[data-fake-popup]").forEach((node) => node.remove());
  vi.restoreAllMocks();
});

describe("detached windows", () => {
  test("no pop-out control unless poppable", () => {
    render(<DashfooLayout components={components} defaultModel={model()} />);

    expect(screen.queryByLabelText("Open panel in a new window")).not.toBeInTheDocument();
  });

  test("popping a tabset opens a window and renders the panel into it", () => {
    const popups: Array<FakePopup> = [];
    vi.spyOn(window, "open").mockImplementation(() => {
      const popup = makeFakePopup();
      popups.push(popup);
      return popup.window;
    });

    render(<DashfooLayout components={components} defaultModel={model()} poppable />);

    fireEvent.click(screen.getByLabelText("Open panel in a new window"));

    expect(window.open).toHaveBeenCalledTimes(1);
    expect(popups).toHaveLength(1);

    // The active panel now lives in the popup, with a "Dock back" control.
    const popup = within(popups[0]!.container);
    expect(popup.getByText("CHART")).toBeInTheDocument();
    expect(popup.getByLabelText("Dock panel back into the main window")).toBeInTheDocument();
  });

  test("dock-back returns the panel to the main layout and closes the popup", async () => {
    const popups: Array<FakePopup> = [];
    vi.spyOn(window, "open").mockImplementation(() => {
      const popup = makeFakePopup();
      popups.push(popup);
      return popup.window;
    });

    render(<DashfooLayout components={components} defaultModel={model()} poppable />);
    fireEvent.click(screen.getByLabelText("Open panel in a new window"));

    const popup = popups[0]!;
    // The release defers the actual unmount/close to a microtask, so flush it.
    await act(async () => {
      fireEvent.click(
        within(popup.container).getByLabelText("Dock panel back into the main window"),
      );
      await Promise.resolve();
    });

    expect(popup.window.closed).toBe(true);
    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
    expect(screen.getByText("CHART")).toBeInTheDocument();
  });

  test("the imperative detachTab handle opens a window in-gesture", () => {
    const popups: Array<FakePopup> = [];
    vi.spyOn(window, "open").mockImplementation(() => {
      const popup = makeFakePopup();
      popups.push(popup);
      return popup.window;
    });

    const ref = createRef<DashfooHandle>();
    render(<DashfooLayout components={components} defaultModel={model()} poppable ref={ref} />);

    act(() => ref.current?.detachTab("t1"));

    expect(window.open).toHaveBeenCalledTimes(1);
    expect(within(popups[0]!.container).getByText("CHART")).toBeInTheDocument();
  });

  test("a blocked popup leaves the panel docked", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // window.open returning null is how browsers signal a blocked popup.
    vi.spyOn(window, "open").mockImplementation(() => null);

    render(<DashfooLayout components={components} defaultModel={model()} poppable />);
    fireEvent.click(screen.getByLabelText("Open panel in a new window"));

    // The detach was not dispatched, so the panel is still in the main layout.
    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
    expect(screen.getByText("CHART")).toBeInTheDocument();
    expect(document.querySelector("[data-fake-popup]")).toBeNull();
    warn.mockRestore();
  });

  test("closing the popup window (pagehide) docks the panel back", () => {
    const popups: Array<FakePopup> = [];
    vi.spyOn(window, "open").mockImplementation(() => {
      const popup = makeFakePopup();
      popups.push(popup);
      return popup.window;
    });

    render(<DashfooLayout components={components} defaultModel={model()} poppable />);
    fireEvent.click(screen.getByLabelText("Open panel in a new window"));

    fireEvent(window, new Event("noop")); // settle
    popups[0]!.fireClose();

    expect(screen.getByRole("tab", { name: "Chart" })).toBeInTheDocument();
  });
});

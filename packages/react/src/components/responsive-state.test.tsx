import { model, row, tab, tabset } from "@dashfoo/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { DashfooLayout } from "./dashfoo-layout";

afterEach(() => {
  vi.unstubAllGlobals();
});

class MeasuredContainerObserver {
  callback: (entries: Array<{ contentRect: { width: number } }>) => void;
  constructor(callback: (entries: Array<{ contentRect: { width: number } }>) => void) {
    this.callback = callback;
  }
  observe(target: Element): void {
    if (target instanceof HTMLElement && target.dataset.dashfoo === "layout") {
      this.callback([{ contentRect: { width: 1000 } }]);
    }
  }
  disconnect(): void {}
  unobserve(): void {}
}

const Notes = (): ReactNode => {
  const [value, setValue] = useState("");
  return (
    <input
      aria-label="Nested notes"
      onChange={(event) => {
        setValue(event.target.value);
      }}
      value={value}
    />
  );
};

test("nested panel state survives entering and leaving the compact projection", () => {
  vi.stubGlobal("ResizeObserver", MeasuredContainerObserver);
  const nested = row(
    [
      tabset([tab("notes", "Notes")], { id: "notes" }),
      tabset([tab("other", "Other")], { id: "other" }),
    ],
    { id: "nested", orientation: "column" },
  );
  const tree = row([tabset([tab("main", "Main")], { id: "main" }), nested], { id: "root" });
  const seed = model(tree);
  const components = { main: () => <p>Main</p>, notes: Notes, other: () => <p>Other</p> };
  const view = (maxWidth: number): ReactNode => (
    <DashfooLayout
      components={components}
      defaultModel={seed}
      keepMounted
      responsive={{ maxWidth }}
    />
  );
  const { rerender } = render(view(720));
  const input = screen.getByRole("textbox", { name: "Nested notes" });
  fireEvent.change(input, { target: { value: "Retain this draft" } });
  rerender(view(1200));
  expect(screen.getByRole("textbox", { name: "Nested notes" })).toBe(input);
  expect(input).toHaveValue("Retain this draft");
  rerender(view(720));
  expect(screen.getByRole("textbox", { name: "Nested notes" })).toBe(input);
  expect(input).toHaveValue("Retain this draft");
});

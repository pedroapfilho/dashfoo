import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { overflowingIds } from "../hooks/use-tab-overflow";

import { TabOverflowMenu } from "./tab-overflow";

const makeTablist = (tabs: Array<[string, number]>, rightEdge: number): HTMLElement => {
  const tablist = document.createElement("div");
  vi.spyOn(tablist, "getBoundingClientRect").mockReturnValue({ right: rightEdge } as DOMRect);
  for (const [id, right] of tabs) {
    const tab = document.createElement("button");
    tab.dataset.tabId = id;
    tab.dataset.dashfoo = "tab";
    vi.spyOn(tab, "getBoundingClientRect").mockReturnValue({ right } as DOMRect);
    tablist.append(tab);
  }
  return tablist;
};

describe("overflowingIds", () => {
  test("returns tabs whose right edge is past the tablist's visible edge", () => {
    const tablist = makeTablist(
      [
        ["a", 40],
        ["b", 90],
        ["c", 140],
      ],
      100,
    );
    expect(overflowingIds(tablist)).toEqual(["c"]);
  });

  test("returns empty when nothing overflows", () => {
    const tablist = makeTablist(
      [
        ["a", 40],
        ["b", 90],
      ],
      100,
    );
    expect(overflowingIds(tablist)).toEqual([]);
  });
});

const THREE_ITEMS = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma" },
];

describe("TabOverflowMenu", () => {
  test("lists the hidden tabs and selects one, then closes", () => {
    const handleSelect = vi.fn<(id: string) => void>();
    render(<TabOverflowMenu items={[{ id: "c", name: "Console" }]} onSelect={handleSelect} />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Console" }));
    expect(handleSelect).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("Escape closes the menu", () => {
    const handleSelect = vi.fn<(id: string) => void>();
    render(<TabOverflowMenu items={[{ id: "c", name: "Console" }]} onSelect={handleSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("opening moves focus to the first menuitem", () => {
    render(<TabOverflowMenu items={THREE_ITEMS} onSelect={vi.fn<(id: string) => void>()} />);

    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));

    expect(screen.getByRole("menuitem", { name: "Alpha" })).toHaveFocus();
  });

  test("roving tabindex marks only the active item as tabbable", () => {
    render(<TabOverflowMenu items={THREE_ITEMS} onSelect={vi.fn<(id: string) => void>()} />);
    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));

    expect(screen.getByRole("menuitem", { name: "Alpha" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("menuitem", { name: "Beta" })).toHaveAttribute("tabindex", "-1");
  });

  test("ArrowDown moves focus to the next item and wraps at the end", () => {
    render(<TabOverflowMenu items={THREE_ITEMS} onSelect={vi.fn<(id: string) => void>()} />);
    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));
    const menu = screen.getByRole("menu");

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Beta" })).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Gamma" })).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Alpha" })).toHaveFocus();
  });

  test("ArrowUp moves focus to the previous item and wraps at the start", () => {
    render(<TabOverflowMenu items={THREE_ITEMS} onSelect={vi.fn<(id: string) => void>()} />);
    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));
    const menu = screen.getByRole("menu");

    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Gamma" })).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Beta" })).toHaveFocus();
  });

  test("Home jumps to the first item and End jumps to the last", () => {
    render(<TabOverflowMenu items={THREE_ITEMS} onSelect={vi.fn<(id: string) => void>()} />);
    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));
    const menu = screen.getByRole("menu");

    fireEvent.keyDown(menu, { key: "End" });
    expect(screen.getByRole("menuitem", { name: "Gamma" })).toHaveFocus();

    fireEvent.keyDown(menu, { key: "Home" });
    expect(screen.getByRole("menuitem", { name: "Alpha" })).toHaveFocus();
  });

  test("Escape closes the menu and returns focus to the trigger", () => {
    render(<TabOverflowMenu items={THREE_ITEMS} onSelect={vi.fn<(id: string) => void>()} />);
    const trigger = screen.getByRole("button", { name: "More tabs" });
    fireEvent.click(trigger);

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("selecting an item calls onSelect, closes, and returns focus to the trigger", () => {
    const handleSelect = vi.fn<(id: string) => void>();
    render(<TabOverflowMenu items={THREE_ITEMS} onSelect={handleSelect} />);
    const trigger = screen.getByRole("button", { name: "More tabs" });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("menuitem", { name: "Beta" }));

    expect(handleSelect).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("reopening resets the active item to the first", () => {
    render(<TabOverflowMenu items={THREE_ITEMS} onSelect={vi.fn<(id: string) => void>()} />);
    const trigger = screen.getByRole("button", { name: "More tabs" });

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "End" });
    expect(screen.getByRole("menuitem", { name: "Gamma" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    fireEvent.click(trigger);

    expect(screen.getByRole("menuitem", { name: "Alpha" })).toHaveFocus();
  });
});

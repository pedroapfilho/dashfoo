import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { TabOverflowMenu } from "./tab-overflow";
import { overflowingIds } from "./use-tab-overflow";

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

describe("TabOverflowMenu", () => {
  test("lists the hidden tabs and selects one, then closes", () => {
    const handleSelect = vi.fn();
    render(<TabOverflowMenu items={[{ id: "c", name: "Console" }]} onSelect={handleSelect} />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Console" }));
    expect(handleSelect).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("Escape closes the menu", () => {
    const handleSelect = vi.fn();
    render(<TabOverflowMenu items={[{ id: "c", name: "Console" }]} onSelect={handleSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

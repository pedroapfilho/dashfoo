import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// The `responsive` prop on an editable layout (Overview, "/"). Below maxWidth it
// stacks into one column and locks tab/tabset drag and split resize; the stacked
// view is a view-only projection, so widening restores the exact arrangement
// without a remount. The swap rides a ResizeObserver, so columns are polled.

const columns = (page: Page): Promise<number> =>
  page.locator('[data-dashfoo="tabset"]').evaluateAll((els) => {
    const xs = els.map((el) => Math.round(el.getBoundingClientRect().x));
    return new Set(xs).size;
  });

const tabsByTabset = (page: Page): Promise<Array<Array<string | null>>> =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-dashfoo="tabset"]')].map((tabset) =>
      [...tabset.querySelectorAll('[data-dashfoo="tab"]')].map((tab) => tab.textContent),
    ),
  );

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("stacks into one column and locks drag + resize below the breakpoint", async ({ page }) => {
  // Editable desktop layout: grips visible, splitters live, more than one column.
  expect(await columns(page)).toBeGreaterThan(1);
  await expect(page.getByRole("button", { name: "Move tabset" }).first()).toBeVisible();
  await expect(page.locator('[data-dashfoo="splitter"]').first()).not.toHaveAttribute(
    "data-separator",
    "disabled",
  );

  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);

  // Locked: no tabset grips, and no splitter is left enabled.
  await expect(page.getByRole("button", { name: "Move tabset" })).toHaveCount(0);
  await expect(
    page.locator('[data-dashfoo="splitter"]:not([data-separator="disabled"])'),
  ).toHaveCount(0);
});

test("restores the exact desktop arrangement after narrow then widen (no remount)", async ({
  page,
}) => {
  const before = await tabsByTabset(page);
  expect(await columns(page)).toBeGreaterThan(1);

  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);

  await page.setViewportSize({ height: 720, width: 1280 });
  await expect.poll(() => columns(page)).toBeGreaterThan(1);

  // The canonical model was never mutated, so the arrangement comes back intact.
  expect(await tabsByTabset(page)).toEqual(before);
});

test("the stacked, locked view still selects tabs by tap", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);

  await page.getByRole("tab", { name: "Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");
});

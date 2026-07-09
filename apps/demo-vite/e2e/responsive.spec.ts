import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

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
  expect(await columns(page)).toBeGreaterThan(1);
  await expect(page.getByRole("button", { name: "Move tabset" }).first()).toBeVisible();
  await expect(page.locator('[data-dashfoo="splitter"]').first()).not.toHaveAttribute(
    "data-separator",
    "disabled",
  );

  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);

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

  expect(await tabsByTabset(page)).toEqual(before);
});

test("the stacked, locked view still selects tabs by tap", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);

  await page.getByRole("tab", { name: "Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");
});

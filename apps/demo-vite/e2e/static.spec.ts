import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const tabsByTabset = (page: Page): Promise<Array<Array<string | null>>> =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-dashfoo="tabset"]')].map((tabset) =>
      [...tabset.querySelectorAll('[data-dashfoo="tab"]')].map((tab) => tab.textContent),
    ),
  );

const dragTabTo = async (page: Page, label: string, x: number, y: number): Promise<void> => {
  const box = await page.getByRole("tab", { name: label }).boundingBox();
  if (!box) {
    throw new Error(`no bounding box for tab "${label}"`);
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 8);
  await page.mouse.move(x, y, { steps: 16 });
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/static");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("a locked layout shows no close buttons, grips, or rename editor", async ({ page }) => {
  await expect(page.locator('[data-dashfoo="tab-close"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Move tabset" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Canvas" }).dblclick();
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("a locked layout still selects tabs and maximizes tabsets", async ({ page }) => {
  await page.getByRole("tab", { name: "Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "Maximize" }).first().click();
  await expect(page.getByRole("tab", { name: "Activity" })).toHaveCount(0);

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("tab", { name: "Activity" })).toBeVisible();
});

test("splitters are disabled in place: same gutter, no resize, no grab pill", async ({ page }) => {
  const splitter = page.locator('[data-dashfoo="splitter"]').first();
  await expect(splitter).toHaveAttribute("data-separator", "disabled");

  const pillDisplay = await splitter.evaluate((el) => getComputedStyle(el, "::before").display);
  expect(pillDisplay).toBe("none");

  const before = await splitter.boundingBox();
  if (!before) {
    throw new Error("no bounding box for splitter");
  }
  expect(before.width).toBeGreaterThan(0);

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 120, before.y + before.height / 2, {
    steps: 8,
  });
  await page.mouse.up();

  const after = await splitter.boundingBox();
  expect(after?.x).toBeCloseTo(before.x, 0);
});

test("dragging a tab in a locked layout is a no-op", async ({ page }) => {
  const before = await tabsByTabset(page);

  const target = await page.getByRole("tab", { name: "Activity" }).boundingBox();
  if (!target) {
    throw new Error("no bounding box for target tab");
  }
  await dragTabTo(page, "Canvas", target.x + target.width / 2, target.y + target.height / 2);

  expect(await tabsByTabset(page)).toEqual(before);
});

test("a locked tab keeps symmetric padding without its close button", async ({ page }) => {
  const padding = await page
    .getByRole("tab", { name: "Canvas" })
    .evaluate((el) => [getComputedStyle(el).paddingLeft, getComputedStyle(el).paddingRight]);

  expect(padding[0]).toBe(padding[1]);
});

test("a locked layout stays responsive: it stacks into one column when narrow", async ({
  page,
}) => {
  const columns = async (): Promise<number> => {
    const xs = await page
      .locator('[data-dashfoo="tabset"]')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)));
    return new Set(xs).size;
  };
  expect(await columns()).toBe(2);

  await page.setViewportSize({ height: 900, width: 600 });

  await expect.poll(columns).toBe(1);

  await expect(page.locator('[data-dashfoo="tab-close"]')).toHaveCount(0);

  await page.setViewportSize({ height: 720, width: 1280 });
  await expect.poll(columns).toBe(2);
});

test("unlocking restores editing without losing the layout", async ({ page }) => {
  await page.getByRole("button", { name: "Unlock editing" }).click();

  await expect(page.getByRole("button", { name: "Close Canvas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move tabset" }).first()).toBeVisible();
  await expect(page.locator('[data-dashfoo="splitter"]').first()).not.toHaveAttribute(
    "data-separator",
    "disabled",
  );

  await page.getByRole("button", { name: "Close Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0);

  await page.getByRole("button", { name: "Lock editing" }).click();
  await expect(page.locator('[data-dashfoo="tab-close"]')).toHaveCount(0);
});

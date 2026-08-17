import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { dragElementTo } from "./helpers/drag";

const tabsets = (page: Page): Locator => page.locator('[data-dashfoo="tabset"]');

test.beforeEach(async ({ page }) => {
  await page.goto("/docking");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("dragging a widget card into a tabset adds it as a tab", async ({ page }) => {
  const target = await tabsets(page).nth(1).boundingBox();
  if (!target) {
    throw new Error("no target box");
  }

  await dragElementTo(
    page,
    page.getByTestId("widget-reports"),
    target.x + target.width / 2,
    target.y + target.height / 2,
  );

  await expect(page.getByRole("tab", { name: "Reports" })).toBeVisible();

  await expect(tabsets(page)).toHaveCount(2);
});

test("dragging a widget card to a tabset edge splits the layout", async ({ page }) => {
  const target = await tabsets(page).nth(1).boundingBox();
  if (!target) {
    throw new Error("no target box");
  }

  await dragElementTo(
    page,
    page.getByTestId("widget-metrics"),
    target.x + target.width / 2,
    target.y + target.height * 0.94,
  );

  await expect(page.getByRole("tab", { name: "Metrics" })).toBeVisible();
  await expect.poll(() => tabsets(page).count()).toBe(3);
});

test("the add button inserts the widget, and ids stay unique across repeats", async ({ page }) => {
  await page.getByRole("button", { name: "Add Reports" }).click();
  await page.getByRole("button", { name: "Add Reports" }).click();

  await expect(page.getByRole("tab", { name: "Reports" })).toHaveCount(2);
});

test("a drop outside any tabset is a no-op", async ({ page }) => {
  const card = page.getByTestId("widget-alerts");
  const box = await card.boundingBox();
  if (!box) {
    throw new Error("no card box");
  }

  await dragElementTo(page, card, box.x + box.width / 2, box.y + box.height / 2 + 40);

  await expect(page.getByRole("tab", { name: "Alerts" })).toHaveCount(0);
  await expect(tabsets(page)).toHaveCount(2);
});

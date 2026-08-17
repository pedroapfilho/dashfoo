import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { dragElementTo } from "./helpers/drag";

const tabsets = (page: Page): Locator => page.locator('[data-dashfoo="tabset"]');

test.beforeEach(async ({ page }) => {
  await page.goto("/docking");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("dragging a tabset grip onto another tabset merges their tabs", async ({ page }) => {
  await expect(tabsets(page)).toHaveCount(2);
  const target = await tabsets(page).nth(1).boundingBox();
  if (!target) {
    throw new Error("no target box");
  }

  const grip = tabsets(page).first().locator('[data-dashfoo="tabset-grip"]');
  await dragElementTo(page, grip, target.x + target.width / 2, target.y + target.height / 2);

  await expect.poll(() => tabsets(page).count()).toBe(1);
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Tasks" })).toBeVisible();
});

test("dragging a tabset grip to an edge splits it beside the target", async ({ page }) => {
  await expect(tabsets(page)).toHaveCount(2);
  const target = await tabsets(page).nth(1).boundingBox();
  if (!target) {
    throw new Error("no target box");
  }

  await expect(page.locator('[data-separator][aria-orientation="horizontal"]')).toHaveCount(0);

  const grip = tabsets(page).first().locator('[data-dashfoo="tabset-grip"]');
  await dragElementTo(page, grip, target.x + target.width / 2, target.y + target.height * 0.94);

  await expect.poll(() => tabsets(page).count()).toBe(2);
  await expect
    .poll(() => page.locator('[data-separator][aria-orientation="horizontal"]').count())
    .toBeGreaterThan(0);
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Activity" })).toBeVisible();
});

import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const tabsets = (page: Page): Locator => page.locator('[data-dashfoo="tabset"]');

const dragGripTo = async (page: Page, grip: Locator, x: number, y: number): Promise<void> => {
  const box = await grip.boundingBox();
  if (!box) {
    throw new Error("no grip box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 8); // arm the sensor
  await page.mouse.move(x, y, { steps: 16 });
  await page.mouse.move(x, y, { steps: 4 }); // settle on the target
  await page.mouse.up();
};

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
  await dragGripTo(page, grip, target.x + target.width / 2, target.y + target.height / 2);

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

  // the docking layout starts side by side (a vertical splitter, no horizontal one)
  await expect(page.locator('[data-separator][aria-orientation="horizontal"]')).toHaveCount(0);

  // drop on the bottom edge band of the second tabset
  const grip = tabsets(page).first().locator('[data-dashfoo="tabset-grip"]');
  await dragGripTo(page, grip, target.x + target.width / 2, target.y + target.height * 0.94);

  // still two tabsets, now stacked as a unit (a horizontal splitter appears)
  await expect.poll(() => tabsets(page).count()).toBe(2);
  await expect
    .poll(() => page.locator('[data-separator][aria-orientation="horizontal"]').count())
    .toBeGreaterThan(0);
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Activity" })).toBeVisible();
});

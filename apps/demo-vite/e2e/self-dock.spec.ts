import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { dragTabTo } from "./helpers/drag";

const tabsetCount = (page: Page): Promise<number> =>
  page.locator('[data-dashfoo="tabset"]').count();

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("dragging the sole tab of a tabset back over itself shows no dock preview", async ({
  page,
}) => {
  const canvas = await page.locator('[data-dashfoo="tabset"]').first().boundingBox();
  if (!canvas) {
    throw new Error("no canvas tabset box");
  }
  await dragTabTo(page, "Tasks", canvas.x + 8, canvas.y + canvas.height / 2);
  await expect.poll(() => tabsetCount(page)).toBe(4);

  const tasksTabset = page.locator('[data-dashfoo="tabset"]', { hasText: "Tasks" });
  const box = await tasksTabset.boundingBox();
  const tab = await page.getByRole("tab", { name: "Tasks" }).boundingBox();
  if (!box || !tab) {
    throw new Error("no boxes for the sole-tab self-drag");
  }
  await page.mouse.move(tab.x + tab.width / 2, tab.y + tab.height / 2);
  await page.mouse.down();
  await page.mouse.move(tab.x + tab.width / 2 + 8, tab.y + tab.height / 2 + 8);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6, { steps: 12 });

  await expect(page.locator('[data-dashfoo="dock-indicator"]')).toHaveCount(0);

  await page.mouse.up();

  await expect.poll(() => tabsetCount(page)).toBe(4);
});

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/docking");
  await expect(page.getByRole("tab", { name: "Canvas" }).first()).toBeVisible();
});

test("the end-of-strip insertion line sits past the last tab's close button", async ({ page }) => {
  const firstTabset = page.locator('[data-dashfoo="tabset"]').first();
  const notesItem = firstTabset.locator('[data-dashfoo="tab-item"]', { hasText: "Notes" });
  const closeBox = await notesItem.locator('[data-dashfoo="tab-close"]').boundingBox();
  const tasks = await page.getByRole("tab", { name: "Tasks" }).boundingBox();
  if (!closeBox || !tasks) {
    throw new Error("missing boxes");
  }

  await page.mouse.move(tasks.x + tasks.width / 2, tasks.y + tasks.height / 2);
  await page.mouse.down();
  await page.mouse.move(tasks.x + tasks.width / 2 - 8, tasks.y + tasks.height / 2 + 6, {
    steps: 5,
  });

  const targetX = closeBox.x + closeBox.width + 12;
  const targetY = closeBox.y + closeBox.height / 2;
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.move(targetX, targetY);

  const line = page.locator('[data-dashfoo="dock-indicator"]');
  await expect(line).toBeVisible();
  await expect
    .poll(async () => {
      const box = await line.boundingBox();
      return box?.x ?? -1;
    })
    .toBeGreaterThanOrEqual(closeBox.x + closeBox.width - 4);

  await page.mouse.up();
});

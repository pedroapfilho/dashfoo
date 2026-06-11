import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/docking");
  await expect(page.getByRole("tab", { name: "Canvas" }).first()).toBeVisible();
});

// Regression: dropping at the end of a strip must place the insertion ghost past
// the last tab's close button — not between the label and the close.
test("the end-of-strip insertion ghost starts past the last tab's close button", async ({
  page,
}) => {
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
  }); // arm
  // hover just past the close button, in the empty end of the strip
  await page.mouse.move(closeBox.x + closeBox.width + 12, closeBox.y + closeBox.height / 2, {
    steps: 12,
  });

  const ghost = await page.locator('[data-dashfoo="dock-indicator"]').boundingBox();
  expect(ghost).not.toBeNull();
  expect(ghost?.x ?? 0).toBeGreaterThanOrEqual(closeBox.x + closeBox.width - 2);

  await page.mouse.up();
});

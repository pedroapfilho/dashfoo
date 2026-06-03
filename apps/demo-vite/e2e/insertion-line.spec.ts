import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/docking");
  await expect(page.getByRole("tab", { name: "Chart" }).first()).toBeVisible();
});

// Regression: dropping at the end of a strip must place the insertion line past
// the last tab's close button — not between the label and the close.
test("the end-of-strip insertion line sits past the last tab's close button", async ({ page }) => {
  const firstTabset = page.locator('[data-dashfoo="tabset"]').first();
  const notesItem = firstTabset.locator('[data-dashfoo="tab-item"]', { hasText: "Notes" });
  const closeBox = await notesItem.locator('[data-dashfoo="tab-close"]').boundingBox();
  const trades = await page.getByRole("tab", { name: "Trades" }).boundingBox();
  if (!closeBox || !trades) {
    throw new Error("missing boxes");
  }

  await page.mouse.move(trades.x + trades.width / 2, trades.y + trades.height / 2);
  await page.mouse.down();
  await page.mouse.move(trades.x + trades.width / 2 - 8, trades.y + trades.height / 2 + 6, {
    steps: 5,
  }); // arm
  // hover just past the close button, in the empty end of the strip
  await page.mouse.move(closeBox.x + closeBox.width + 12, closeBox.y + closeBox.height / 2, {
    steps: 12,
  });

  const line = await page.locator('[data-dashfoo="dock-indicator"]').boundingBox();
  expect(line).not.toBeNull();
  const lineCenter = (line?.x ?? 0) + (line?.width ?? 0) / 2;
  expect(lineCenter).toBeGreaterThanOrEqual(closeBox.x + closeBox.width - 2);

  await page.mouse.up();
});

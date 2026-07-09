import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/docking");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("the drop-zone map appears mid-drag and clears after the drop", async ({ page }) => {
  const overlay = page.getByTestId("drop-zone-overlay");
  await expect(overlay).toHaveCount(0);

  const box = await page.getByRole("tab", { name: "Canvas" }).boundingBox();
  const target = await page.locator('[data-dashfoo="tabset"]').last().boundingBox();
  if (!box || !target) {
    throw new Error("missing tab or tabset bounding box");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 8);
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });

  await expect(overlay).toBeVisible();

  const tabsets = await page.locator('[data-dashfoo="tabset"]').count();
  expect(await overlay.locator("polygon").count()).toBeGreaterThanOrEqual(tabsets * 5);

  await page.mouse.up();
  await expect(overlay).toHaveCount(0);
});

test("the toggle disables the map", async ({ page }) => {
  await page.getByRole("button", { name: "Hide drop zones" }).click();

  const box = await page.getByRole("tab", { name: "Canvas" }).boundingBox();
  if (!box) {
    throw new Error("missing tab bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 16, box.y + box.height / 2 + 16);

  await expect(page.getByTestId("drop-zone-overlay")).toHaveCount(0);
  await page.mouse.up();
});

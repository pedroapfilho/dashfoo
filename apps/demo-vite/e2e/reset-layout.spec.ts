import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/docking");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("Reset layout restores the default arrangement after edits", async ({ page }) => {
  await page.getByRole("button", { name: "Close Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0);

  await page.getByRole("button", { name: "Add Metrics" }).click();
  await expect(page.getByRole("tab", { name: "Metrics" })).toBeVisible();

  await page.getByRole("button", { name: "Reset layout" }).click();

  await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Metrics" })).toHaveCount(0);
  await expect(page.locator('[data-dashfoo="tabset"]')).toHaveCount(2);
});

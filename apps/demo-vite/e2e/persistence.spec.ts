import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible();
});

test("a layout change survives a reload and Clear resets it", async ({ page }) => {
  await page.getByRole("button", { name: "Close Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0);
  await page.waitForTimeout(500);

  await page.reload();
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0);

  await page.getByRole("button", { name: "Clear saved layout" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible();
});

test("a change made just before a reload is not lost", async ({ page }) => {
  await page.getByRole("button", { name: "Close Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0);
});

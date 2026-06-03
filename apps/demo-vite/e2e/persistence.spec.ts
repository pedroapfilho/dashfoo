import { expect, test } from "@playwright/test";

const KEY = "dashfoo:demo:persistence";

test.beforeEach(async ({ page }) => {
  await page.goto("/persistence");
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, KEY);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Depth" })).toBeVisible();
});

test("a layout change survives a reload and Clear resets it", async ({ page }) => {
  // mutate: close the Depth tab, then let the debounced save land
  await page.getByRole("button", { name: "Close Depth" }).click();
  await expect(page.getByRole("tab", { name: "Depth" })).toHaveCount(0);
  await page.waitForTimeout(500);

  await page.reload();
  await expect(page.getByRole("tab", { name: "Chart" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Depth" })).toHaveCount(0); // survived

  await page.getByRole("button", { name: "Clear saved layout" }).click();
  await expect(page.getByRole("tab", { name: "Depth" })).toBeVisible(); // reset
});

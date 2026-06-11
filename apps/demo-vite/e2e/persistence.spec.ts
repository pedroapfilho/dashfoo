import { expect, test } from "@playwright/test";

// The overview page persists under "dashfoo:demo:overview"; each test starts
// with a fresh browser context, so storage is already clean.
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible();
});

test("a layout change survives a reload and Clear resets it", async ({ page }) => {
  // mutate: close the Detail tab, then let the debounced save land
  await page.getByRole("button", { name: "Close Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0);
  await page.waitForTimeout(500);

  await page.reload();
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0); // survived

  await page.getByRole("button", { name: "Clear saved layout" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible(); // reset
});

// Regression: the debounced save used to die with the page on reload, losing
// any change made in the last ~300ms. The pagehide flush must land it.
test("a change made just before a reload is not lost", async ({ page }) => {
  await page.getByRole("button", { name: "Close Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0);

  await page.reload(); // deliberately no debounce wait
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0); // survived
});

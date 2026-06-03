import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/chrome");
  await expect(page.getByRole("tab", { name: "Chart" })).toBeVisible();
});

test("closing a tab removes it", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Notes" })).toBeVisible();

  await page.getByRole("button", { name: "Close Notes" }).click();

  await expect(page.getByRole("tab", { name: "Notes" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Chart" })).toBeVisible();
});

test("double-clicking a tab renames it inline", async ({ page }) => {
  await page.getByRole("tab", { name: "Chart" }).dblclick();
  const input = page.getByRole("textbox");
  await input.fill("Candles");
  await input.press("Enter");

  await expect(page.getByRole("tab", { name: "Candles" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Chart" })).toHaveCount(0);
});

test("Escape cancels a rename", async ({ page }) => {
  await page.getByRole("tab", { name: "Depth" }).dblclick();
  const input = page.getByRole("textbox");
  await input.fill("Renamed");
  await input.press("Escape");

  await expect(page.getByRole("tab", { name: "Depth" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Renamed" })).toHaveCount(0);
});

test("maximize fills the area; restore brings the other panels back", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Positions" })).toBeVisible();

  await page.getByRole("button", { name: "Maximize" }).first().click();
  await expect(page.getByRole("tab", { name: "Positions" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Chart" })).toBeVisible();

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("tab", { name: "Positions" })).toBeVisible();
});

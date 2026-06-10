import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/chrome");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("closing a tab removes it", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Notes" })).toBeVisible();

  await page.getByRole("button", { name: "Close Notes" }).click();

  await expect(page.getByRole("tab", { name: "Notes" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("double-clicking a tab renames it inline", async ({ page }) => {
  await page.getByRole("tab", { name: "Canvas" }).dblclick();
  const input = page.getByRole("textbox");
  await input.fill("Board");
  await input.press("Enter");

  await expect(page.getByRole("tab", { name: "Board" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Canvas" })).toHaveCount(0);
});

test("Escape cancels a rename", async ({ page }) => {
  await page.getByRole("tab", { name: "Detail" }).dblclick();
  const input = page.getByRole("textbox");
  await input.fill("Renamed");
  await input.press("Escape");

  await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Renamed" })).toHaveCount(0);
});

test("maximize fills the area; restore brings the other panels back", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Metrics" })).toBeVisible();

  await page.getByRole("button", { name: "Maximize" }).first().click();
  await expect(page.getByRole("tab", { name: "Metrics" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("tab", { name: "Metrics" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("tabs do not carry invalid aria-pressed / aria-roledescription", async ({ page }) => {
  const canvas = page.getByRole("tab", { name: "Canvas" });

  await canvas.focus();
  await page.waitForTimeout(150);

  expect(await canvas.getAttribute("aria-pressed")).toBeNull();
  expect(await canvas.getAttribute("aria-grabbed")).toBeNull();
  expect(await canvas.getAttribute("aria-roledescription")).toBeNull();
});

test("a focused tab is the only tabbable one (roving tabindex)", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Canvas" })).toHaveAttribute("tabindex", "0");
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("tabindex", "-1");
});

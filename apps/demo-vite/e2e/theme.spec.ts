import { expect, test } from "@playwright/test";

// Playwright emulates prefers-color-scheme: light by default, so with no stored
// choice the demo starts light.
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("the theme toggle flips dark mode and the choice survives a reload", async ({ page }) => {
  const html = page.locator("html");
  const tabset = page.locator('[data-dashfoo="tabset"]').first();
  await expect(html).not.toHaveAttribute("data-dashfoo-theme", "dark");
  // Computed-style check: the --dashfoo-card token must resolve through the
  // theme pipeline, not just the attribute flip.
  await expect(tabset).toHaveCSS("background-color", "oklch(1 0 0)");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(html).toHaveAttribute("data-dashfoo-theme", "dark");
  await expect(tabset).toHaveCSS("background-color", "oklch(0.205 0 0)");

  await page.reload();
  await expect(html).toHaveAttribute("data-dashfoo-theme", "dark"); // pre-paint script restored it
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(html).not.toHaveAttribute("data-dashfoo-theme", "dark");
});

test("a dark OS preference is the default when nothing is stored", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();

  await expect(page.locator("html")).toHaveAttribute("data-dashfoo-theme", "dark");
  await context.close();
});

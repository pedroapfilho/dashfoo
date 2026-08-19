import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

const DESTINATION = "/getting-started";
const SHELL_MARKER = "[data-testid=docs-shell]";

test("serves the docs shell on an initial load", async ({ baseURL, page }) => {
  await instant(
    page,
    async () => {
      await page.goto(DESTINATION);
      await expect(page.locator(SHELL_MARKER)).toBeVisible();
    },
    { baseURL },
  );
});

test("commits the docs shell on client navigation", async ({ page }) => {
  await page.goto("/");
  const link = page.locator(`a[href="${DESTINATION}"]:visible`).first();
  await expect(link).toBeVisible();

  await instant(page, async () => {
    await link.click();
    await expect(page.locator(SHELL_MARKER)).toBeVisible();
  });

  await expect(page).toHaveURL(/\/getting-started$/v);
});

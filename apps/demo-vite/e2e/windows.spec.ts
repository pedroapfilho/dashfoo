import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const layout = (page: Page, name: "main" | "side"): Locator => page.getByTestId(`windows-${name}`);

test.beforeEach(async ({ page }) => {
  await page.goto("/windows");
  await expect(layout(page, "main").getByRole("tab", { name: "Notes" })).toBeVisible();
});

test("a tab dragged into the other layout of the group moves there", async ({ page }) => {
  const notes = layout(page, "main").getByRole("tab", { name: "Notes" });
  const target = layout(page, "side").locator('[data-dashfoo="tabstrip"]').first();

  await notes.dragTo(target);

  await expect(layout(page, "side").getByRole("tab", { name: "Notes" })).toBeVisible();
  await expect(layout(page, "main").getByRole("tab", { name: "Notes" })).toHaveCount(0);
});

test("popping out the active tab opens it in a popup window", async ({ page }) => {
  await layout(page, "main").getByRole("tab", { name: "Detail" }).click();

  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Pop out active tab" }).click(),
  ]);

  await expect(popup.getByRole("tab", { name: "Detail" })).toBeVisible();
  await expect(layout(page, "main").getByRole("tab", { name: "Detail" })).toHaveCount(0);
});

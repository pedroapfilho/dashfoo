import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/borders");
  await expect(page.getByRole("button", { name: "Files" })).toBeVisible();
});

test("a border strip button toggles its drawer", async ({ page }) => {
  // Files opens by default (selected: 0).
  await expect(page.getByText("README.md")).toBeVisible();

  await page.getByRole("button", { name: "Files" }).click();
  await expect(page.getByText("README.md")).toHaveCount(0);

  await page.getByRole("button", { name: "Outline" }).click();
  await expect(page.getByText("## Layout model")).toBeVisible();
});

test("dragging a tab to the outer gutter docks it as a border", async ({ page }) => {
  const layout = page.locator('[data-dashfoo="layout"]');
  const box = await layout.boundingBox();
  const tab = await page.getByRole("tab", { name: "Trades" }).boundingBox();
  if (!box || !tab) {
    throw new Error("missing boxes");
  }

  // drag Trades to the right edge sliver of the frame → a right border
  await page.mouse.move(tab.x + tab.width / 2, tab.y + tab.height / 2);
  await page.mouse.down();
  await page.mouse.move(tab.x + tab.width / 2 + 8, tab.y + tab.height / 2 + 8);
  await page.mouse.move(box.x + box.width - 6, box.y + box.height / 2, { steps: 16 });
  await page.mouse.move(box.x + box.width - 6, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();

  await expect
    .poll(() => page.locator('[data-dashfoo="border-strip"][data-edge="right"]').count())
    .toBe(1);
});

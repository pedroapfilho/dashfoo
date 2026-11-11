import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { dragElementOver, dragElementTo } from "./helpers/drag";

const tabsets = (page: Page): Locator => page.locator('[data-dashfoo="tabset"]');

const rootRow = (page: Page): Locator => page.locator('[data-dashfoo="row"][data-row-id="root"]');

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();

  if (!found) {
    throw new Error("no bounding box");
  }

  return found;
};

test.beforeEach(async ({ page }) => {
  await page.goto("/docking");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("a tab dropped at the layout's bottom edge docks as a full-width bottom panel", async ({
  page,
}) => {
  const layout = await box(rootRow(page));
  const x = layout.x + layout.width * 0.75;
  const y = layout.y + layout.height - 4;

  await dragElementOver(page, page.getByRole("tab", { name: "Notes" }), x, y);
  await expect(page.locator('[data-dashfoo="dock-indicator"]:not([data-idle])')).toBeVisible();
  await page.mouse.up();

  await expect.poll(() => tabsets(page).count()).toBe(3);

  const panel = await box(
    page.getByRole("tab", { name: "Notes" }).locator('xpath=ancestor::*[@data-dashfoo="tabset"]'),
  );

  expect(panel.width).toBeGreaterThan(layout.width * 0.95);
  expect(panel.y).toBeGreaterThan(layout.y + layout.height / 2);
});

test("with edge docking off, the same drop splits the tabset under the pointer", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Turn off edge docking" }).click();
  const layout = await box(rootRow(page));

  await dragElementTo(
    page,
    page.getByRole("tab", { name: "Notes" }),
    layout.x + layout.width * 0.75,
    layout.y + layout.height - 4,
  );

  await expect.poll(() => tabsets(page).count()).toBe(3);

  const panel = await box(
    page.getByRole("tab", { name: "Notes" }).locator('xpath=ancestor::*[@data-dashfoo="tabset"]'),
  );

  expect(panel.width).toBeLessThan(layout.width * 0.6);
});

test("a tabset dragged by the empty space in its header merges into another", async ({ page }) => {
  await expect(tabsets(page)).toHaveCount(2);
  const strip = tabsets(page).first().locator('[data-dashfoo="tabstrip"]');
  const stripBox = await box(strip);
  const lastTab = await box(tabsets(page).first().locator('[data-dashfoo="tab-item"]').last());
  const target = await box(tabsets(page).nth(1));

  const fromX = lastTab.x + lastTab.width + 12;
  const fromY = stripBox.y + stripBox.height / 2;
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(fromX + 8, fromY + 8);
  await expect(page.locator('[data-dashfoo="drag-preview"]')).toHaveText("Canvas (+2)");
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 16 });
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 4 });
  await page.mouse.up();

  await expect.poll(() => tabsets(page).count()).toBe(1);
  await expect(page.getByRole("tab", { name: "Notes" })).toBeVisible();
});

test("the indicator idles in place between targets instead of disappearing", async ({ page }) => {
  const target = await box(tabsets(page).nth(1));

  await dragElementOver(
    page,
    page.getByRole("tab", { name: "Detail" }),
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
  const indicator = page.locator('[data-dashfoo="dock-indicator"]');
  await expect(indicator).not.toHaveAttribute("data-idle");

  await page.mouse.move(target.x + target.width / 2, 2, { steps: 8 });
  await expect(indicator).toHaveAttribute("data-idle", "true");
  await expect(indicator).toHaveCSS("opacity", "0");
  await page.mouse.up();
  await expect(indicator).toHaveCount(0);
});

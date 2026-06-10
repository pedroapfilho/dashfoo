import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const tabsetCount = (page: Page): Promise<number> =>
  page.locator('[data-dashfoo="tabset"]').count();

const dragTabTo = async (page: Page, label: string, x: number, y: number): Promise<void> => {
  const box = await page.getByRole("tab", { name: label }).boundingBox();
  if (!box) {
    throw new Error(`no bounding box for tab "${label}"`);
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 8); // arm the sensor
  await page.mouse.move(x, y, { steps: 16 });
  await page.mouse.move(x, y, { steps: 4 }); // settle on the target
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

// The sole tab of a tabset dropped back onto that same tabset is a no-op: the
// dock preview must not appear, since splitting/stacking it beside itself does
// nothing once the emptied source collapses.
test("dragging the sole tab of a tabset back over itself shows no dock preview", async ({
  page,
}) => {
  // First split "Tasks" into its own (sole-tab) tabset on the left of the canvas.
  const canvas = await page.locator('[data-dashfoo="tabset"]').first().boundingBox();
  if (!canvas) {
    throw new Error("no canvas tabset box");
  }
  await dragTabTo(page, "Tasks", canvas.x + 8, canvas.y + canvas.height / 2);
  await expect.poll(() => tabsetCount(page)).toBe(4);

  // Now drag that sole "Tasks" tab over its own tabset body.
  const tasksTabset = page.locator('[data-dashfoo="tabset"]', { hasText: "Tasks" });
  const box = await tasksTabset.boundingBox();
  const tab = await page.getByRole("tab", { name: "Tasks" }).boundingBox();
  if (!box || !tab) {
    throw new Error("no boxes for the sole-tab self-drag");
  }
  await page.mouse.move(tab.x + tab.width / 2, tab.y + tab.height / 2);
  await page.mouse.down();
  await page.mouse.move(tab.x + tab.width / 2 + 8, tab.y + tab.height / 2 + 8); // arm the sensor
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6, { steps: 12 });

  // No "where it lands" indicator for a no-op self-drop.
  await expect(page.locator('[data-dashfoo="dock-indicator"]')).toHaveCount(0);

  await page.mouse.up();
  // Layout is unchanged: still four tabsets.
  await expect.poll(() => tabsetCount(page)).toBe(4);
});

import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// Sizing constraints on the docking layout: tabset "a" sets min: 180, "b" uses
// the engine default.
const aPanel = (page: Page): Locator => page.locator("#a");
const bPanel = (page: Page): Locator => page.locator("#b");
const splitter = (page: Page): Locator => page.locator('[data-dashfoo="splitter"]').first();

const panelWidth = async (panel: Locator): Promise<number> => {
  const box = await panel.boundingBox();
  if (!box) {
    throw new Error("panel has no bounding box");
  }
  return box.width;
};

const dragSplitterTo = async (page: Page, x: number): Promise<void> => {
  const box = await splitter(page).boundingBox();
  if (!box) {
    throw new Error("splitter has no bounding box");
  }
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 16 });
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/docking");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("a tabset with an explicit min width cannot be dragged smaller", async ({ page }) => {
  const a = await aPanel(page).boundingBox();
  if (!a) {
    throw new Error("tabset a has no bounding box");
  }

  await dragSplitterTo(page, a.x + 20);

  await expect.poll(() => panelWidth(aPanel(page))).toBeGreaterThanOrEqual(179);
});

test("tabsets use the default min width when no node min is set", async ({ page }) => {
  const b = await bPanel(page).boundingBox();
  if (!b) {
    throw new Error("tabset b has no bounding box");
  }

  await dragSplitterTo(page, b.x + b.width - 10);

  await expect.poll(() => panelWidth(bPanel(page))).toBeGreaterThanOrEqual(319);
});

test("the overview side column keeps descendant tabset minimum width", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Activity" })).toBeVisible();

  const rootSplitter = page
    .locator('[data-dashfoo="splitter"][aria-orientation="vertical"]')
    .first();
  const box = await rootSplitter.boundingBox();
  if (!box) {
    throw new Error("root splitter has no bounding box");
  }

  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(2000, y, { steps: 16 });
  await page.mouse.up();

  await expect.poll(() => panelWidth(page.locator("#ts-side-top"))).toBeGreaterThanOrEqual(319);
});

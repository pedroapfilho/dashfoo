import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const KEY = "dashfoo:demo:sizing";

const sidePanel = (page: Page): Locator => page.locator("#side");
const mainPanel = (page: Page): Locator => page.locator("#main");
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
  await page.goto("/sizing");
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, KEY);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Navigator" })).toBeVisible();
});

test("a tabset with an explicit min width cannot be dragged smaller", async ({ page }) => {
  const side = await sidePanel(page).boundingBox();
  if (!side) {
    throw new Error("side panel has no bounding box");
  }

  await dragSplitterTo(page, side.x + 20);

  await expect.poll(() => panelWidth(sidePanel(page))).toBeGreaterThanOrEqual(179);
});

test("tabsets use the default min width when no node min is set", async ({ page }) => {
  const main = await mainPanel(page).boundingBox();
  if (!main) {
    throw new Error("main panel has no bounding box");
  }

  await dragSplitterTo(page, main.x + main.width - 10);

  await expect.poll(() => panelWidth(mainPanel(page))).toBeGreaterThanOrEqual(119);
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

  await expect.poll(() => panelWidth(page.locator("#ts-side-top"))).toBeGreaterThanOrEqual(119);
});

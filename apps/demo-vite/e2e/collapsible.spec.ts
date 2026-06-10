import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const KEY = "dashfoo:demo:collapsible";

const sidePanel = (page: Page): Locator => page.locator("#side");
const mainPanel = (page: Page): Locator => page.locator("#main");
const splitter = (page: Page): Locator => page.locator('[data-dashfoo="splitter"]').first();
const collapsedTabset = (page: Page): Locator =>
  page.locator('[data-dashfoo="tabset"][data-collapsed]');

const panelWidth = async (panel: Locator): Promise<number> => {
  const box = await panel.boundingBox();
  if (!box) {
    throw new Error("panel has no bounding box");
  }
  return box.width;
};

const locatorWidth = async (locator: Locator): Promise<number> => {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("locator has no bounding box");
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

const collapseSidebar = async (page: Page): Promise<number> => {
  const before = await panelWidth(sidePanel(page));
  const side = await sidePanel(page).boundingBox();
  if (!side) {
    throw new Error("side panel has no bounding box");
  }
  await dragSplitterTo(page, side.x + 65);
  await expect(collapsedTabset(page)).toBeVisible();
  return before;
};

test.beforeEach(async ({ page }) => {
  await page.goto("/collapsible");
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, KEY);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Navigator" })).toBeVisible();
});

test("dragging below the midpoint collapses the sidebar to its rail", async ({ page }) => {
  await collapseSidebar(page);

  await expect.poll(() => panelWidth(sidePanel(page))).toBeLessThanOrEqual(39);
  await expect
    .poll(async () => (await panelWidth(sidePanel(page))) + (await locatorWidth(splitter(page))))
    .toBeLessThanOrEqual(43);
  await expect(splitter(page)).toBeVisible();
});

test("dragging back past min reopens the sidebar near its previous width", async ({ page }) => {
  const before = await collapseSidebar(page);
  const side = await sidePanel(page).boundingBox();
  if (!side) {
    throw new Error("side panel has no bounding box");
  }

  await dragSplitterTo(page, side.x + before);

  await expect(collapsedTabset(page)).toHaveCount(0);
  await expect.poll(() => panelWidth(sidePanel(page))).toBeGreaterThanOrEqual(before - 8);
});

test("double-clicking the separator restores the previous expanded width", async ({ page }) => {
  const before = await collapseSidebar(page);

  await splitter(page).dblclick();

  await expect(collapsedTabset(page)).toHaveCount(0);
  await expect.poll(() => panelWidth(sidePanel(page))).toBeGreaterThanOrEqual(before - 8);
});

test("Enter on the focused separator toggles the collapsible panel", async ({ page }) => {
  await splitter(page).focus();
  await page.keyboard.press("Enter");

  await expect(collapsedTabset(page)).toBeVisible();

  await splitter(page).focus();
  await page.keyboard.press("Enter");

  await expect(collapsedTabset(page)).toHaveCount(0);
});

test("the non-collapsible panel respects tabSetMinSize", async ({ page }) => {
  const main = await mainPanel(page).boundingBox();
  if (!main) {
    throw new Error("main panel has no bounding box");
  }

  await dragSplitterTo(page, main.x + main.width - 10);

  await expect.poll(() => panelWidth(mainPanel(page))).toBeGreaterThanOrEqual(119);
});

test("collapsed state persists across reload and can reopen to the previous size", async ({
  page,
}) => {
  const before = await collapseSidebar(page);
  await page.waitForTimeout(500);

  await page.reload();
  await expect(collapsedTabset(page)).toBeVisible();

  const side = await sidePanel(page).boundingBox();
  if (!side) {
    throw new Error("side panel has no bounding box");
  }
  await dragSplitterTo(page, side.x + before);

  await expect(collapsedTabset(page)).toHaveCount(0);
  await expect.poll(() => panelWidth(sidePanel(page))).toBeGreaterThanOrEqual(before - 8);
});

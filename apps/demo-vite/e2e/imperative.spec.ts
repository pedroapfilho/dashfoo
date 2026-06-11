import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const panelWidth = async (panel: Locator): Promise<number> => {
  const box = await panel.boundingBox();
  if (!box) {
    throw new Error("panel has no bounding box");
  }
  return box.width;
};

const dragSplitterBy = async (page: Page, deltaX: number): Promise<void> => {
  const splitter = page.locator('[data-dashfoo="splitter"]').first();
  const box = await splitter.boundingBox();
  if (!box) {
    throw new Error("splitter has no bounding box");
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y, { steps: 16 });
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/controlled");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("the imperative handle drives undo/redo with correct history flags", async ({ page }) => {
  const undo = page.getByRole("button", { name: "Undo" });
  const redo = page.getByRole("button", { name: "Redo" });

  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await page.getByRole("tab", { name: "Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();

  await undo.click();
  await expect(page.getByRole("tab", { name: "Canvas" })).toHaveAttribute("aria-selected", "true");
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
});

test("widget buttons add and remove tabs through the handle, and undo restores them", async ({
  page,
}) => {
  // playground model: Canvas/Detail (active tabset) + Metrics/Tasks
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("tab", { name: "History" })).toBeVisible();

  // make the new tab the selected one, then close it via the handle
  await page.getByRole("tab", { name: "History" }).click();
  await page.getByRole("button", { name: "Close active tab" }).click();
  await expect(page.getByRole("tab", { name: "History" })).toHaveCount(0);

  // both imperative mutations ride the same history as direct interactions
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("tab", { name: "History" })).toBeVisible();
});

test("undo and redo restore resized panel dimensions", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1600 });
  await page.reload();
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();

  const undo = page.getByRole("button", { name: "Undo" });
  const redo = page.getByRole("button", { name: "Redo" });
  const left = page.locator("#left");

  const initialWidth = await panelWidth(left);
  await dragSplitterBy(page, 160);
  await expect.poll(() => panelWidth(left)).toBeGreaterThan(initialWidth + 120);
  const resizedWidth = await panelWidth(left);

  await undo.click();
  await expect.poll(() => panelWidth(left)).toBeLessThan(initialWidth + 10);

  await redo.click();
  await expect.poll(() => panelWidth(left)).toBeGreaterThan(resizedWidth - 10);
});

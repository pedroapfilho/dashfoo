import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// The static-layout page: editable={false} by default, with a toggle that
// flips the prop at runtime. Covers the drag/resize no-ops jsdom cannot.

const tabsByTabset = (page: Page): Promise<Array<Array<string | null>>> =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-dashfoo="tabset"]')].map((tabset) =>
      [...tabset.querySelectorAll('[data-dashfoo="tab"]')].map((tab) => tab.textContent),
    ),
  );

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
  await page.goto("/static");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("a locked layout shows no close buttons, grips, or rename editor", async ({ page }) => {
  await expect(page.locator('[data-dashfoo="tab-close"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Move tabset" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Canvas" }).dblclick();
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("a locked layout still selects tabs and maximizes tabsets", async ({ page }) => {
  await page.getByRole("tab", { name: "Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "Maximize" }).first().click();
  await expect(page.getByRole("tab", { name: "Activity" })).toHaveCount(0);

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("tab", { name: "Activity" })).toBeVisible();
});

test("splitters are disabled in place: same gutter, no resize", async ({ page }) => {
  const splitter = page.locator('[data-dashfoo="splitter"]').first();
  await expect(splitter).toHaveAttribute("data-separator", "disabled");

  const before = await splitter.boundingBox();
  if (!before) {
    throw new Error("no bounding box for splitter");
  }
  expect(before.width).toBeGreaterThan(0);

  // A drag across the gutter must not move it.
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 120, before.y + before.height / 2, {
    steps: 8,
  });
  await page.mouse.up();

  const after = await splitter.boundingBox();
  expect(after?.x).toBeCloseTo(before.x, 0);
});

test("dragging a tab in a locked layout is a no-op", async ({ page }) => {
  const before = await tabsByTabset(page);

  const target = await page.getByRole("tab", { name: "Activity" }).boundingBox();
  if (!target) {
    throw new Error("no bounding box for target tab");
  }
  await dragTabTo(page, "Canvas", target.x + target.width / 2, target.y + target.height / 2);

  expect(await tabsByTabset(page)).toEqual(before);
});

test("unlocking restores editing without losing the layout", async ({ page }) => {
  await page.getByRole("button", { name: "Unlock editing" }).click();

  await expect(page.getByRole("button", { name: "Close Canvas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move tabset" }).first()).toBeVisible();
  await expect(page.locator('[data-dashfoo="splitter"]').first()).not.toHaveAttribute(
    "data-separator",
    "disabled",
  );

  // Editing genuinely works after the flip: close a tab.
  await page.getByRole("button", { name: "Close Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveCount(0);

  // And locking again hides the affordances that were just used.
  await page.getByRole("button", { name: "Lock editing" }).click();
  await expect(page.locator('[data-dashfoo="tab-close"]')).toHaveCount(0);
});

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("floats a panel into an in-app overlay and docks it back", async ({ page }) => {
  await page.getByLabel("Float panel").first().click();

  // The panel now lives in an in-app floating overlay (same document, no popup),
  // with a drag title bar and a dock-back control.
  const float = page.locator('[data-dashfoo="float"]');
  await expect(float).toBeVisible();
  await expect(float.getByLabel("Dock panel back into the main layout")).toBeVisible();

  // Dock it back: the float disappears and the panel returns to the layout.
  await float.getByLabel("Dock panel back into the main layout").click();
  await expect(page.locator('[data-dashfoo="float"]')).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("dragging the title bar moves the float", async ({ page }) => {
  // Float a smaller side panel so there is room to move it within the layout.
  await page.getByLabel("Float panel").last().click();
  const float = page.locator('[data-dashfoo="float"]');
  await expect(float).toBeVisible();

  const before = await float.boundingBox();
  const box = (await float.locator('[data-dashfoo="float-titlebar"]').boundingBox())!;
  // The bottom-right side panel floats at the bottom edge, so move up-left where
  // there is room within the layout bounds.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2 - 80, { steps: 8 });
  await page.mouse.up();

  const after = await float.boundingBox();
  expect(after!.x).toBeLessThan(before!.x);
  expect(after!.y).toBeLessThan(before!.y);
});

test("a floated panel can be resized by its handles", async ({ page }) => {
  await page.getByLabel("Float panel").last().click();
  const float = page.locator('[data-dashfoo="float"]');
  await expect(float).toBeVisible();

  const before = await float.boundingBox();
  const box = (await float.locator('[data-dashfoo="float-resize"][data-edge="se"]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60, { steps: 8 });
  await page.mouse.up();

  const after = await float.boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width);
});

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// Drag a tab to a target point with the activation + settle moves dnd-kit needs.
const dragTabTo = async (page: Page, label: string, x: number, y: number): Promise<void> => {
  const box = (await page.getByRole("tab", { name: label }).boundingBox())!;
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

test("the float is titled by its own name and can be renamed", async ({ page }) => {
  await page.getByLabel("Float panel").first().click();
  const float = page.locator('[data-dashfoo="float"]');
  const title = float.locator('[data-dashfoo="float-title"]');
  // Its own name, not the active tab ("Canvas").
  await expect(title).toHaveText("Panel");

  await title.dblclick();
  const input = float.locator('[data-dashfoo="float-rename"]');
  await input.fill("Inspector");
  await input.press("Enter");

  await expect(float.locator('[data-dashfoo="float-title"]')).toHaveText("Inspector");
});

test("a tab can be dragged out of a float and docked into the main layout", async ({ page }) => {
  // Float the main Canvas tabset (Canvas + Detail).
  await page.getByLabel("Float panel").first().click();
  const float = page.locator('[data-dashfoo="float"]');
  await expect(float.getByRole("tab", { name: "Detail" })).toBeVisible();

  // The Activity tabset lives in the docked layout, not the float.
  const target = await page.getByRole("tab", { name: "Activity" }).evaluate((el) => {
    const r = el.closest('[data-dashfoo="tabset"]')!.getBoundingClientRect();
    return { height: r.height, width: r.width, x: r.x, y: r.y };
  });

  await dragTabTo(page, "Detail", target.x + target.width / 2, target.y + target.height / 2);

  // Detail left the float and is now docked among the main tabs.
  await expect.poll(() => float.getByRole("tab", { name: "Detail" }).count()).toBe(0);
  await expect(page.getByRole("tab", { name: "Detail" })).toBeVisible();
});

test("dragging into a float over a docked tabset shows only the float's indicator", async ({
  page,
}) => {
  // Float the bottom-right panel, then move it over the body of the main
  // (Canvas/Detail) tabset so it overlaps a docked tabset.
  await page.getByLabel("Float panel").last().click();
  const float = page.locator('[data-dashfoo="float"]');
  await expect(float).toBeVisible();

  const mainCenter = await page.getByRole("tab", { name: "Canvas" }).evaluate((el) => {
    const r = el.closest('[data-dashfoo="tabset"]')!.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const grip = (await float.locator('[data-dashfoo="float-titlebar"]').boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(mainCenter.x, mainCenter.y, { steps: 10 });
  await page.mouse.up();

  // Drag the docked "Detail" tab into the float, which now sits over the Canvas
  // tabset. Hold the pointer over the float body and assert exactly one dock
  // indicator: the occluded tabset behind the float must not leave a stale one.
  const floatBox = (await float.boundingBox())!;
  const target = { x: floatBox.x + floatBox.width / 2, y: floatBox.y + floatBox.height / 2 };
  const detail = (await page.getByRole("tab", { name: "Detail" }).boundingBox())!;
  await page.mouse.move(detail.x + detail.width / 2, detail.y + detail.height / 2);
  await page.mouse.down();
  await page.mouse.move(detail.x + detail.width / 2 + 8, detail.y + detail.height / 2 + 8);
  await page.mouse.move(target.x, target.y, { steps: 16 });
  await page.mouse.move(target.x, target.y, { steps: 4 });

  await expect.poll(() => page.locator('[data-dashfoo="dock-indicator"]').count()).toBe(1);

  await page.mouse.up();
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

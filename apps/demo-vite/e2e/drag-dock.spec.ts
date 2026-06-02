import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const tabsByTabset = (page: Page): Promise<Array<Array<string | null>>> =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-dashfoo="tabset"]')].map((tabset) =>
      [...tabset.querySelectorAll('[data-dashfoo="tab"]')].map((tab) => tab.textContent),
    ),
  );

const tradesCount = async (page: Page): Promise<number> => {
  const tabs = await tabsByTabset(page);
  return tabs.flat().filter((label) => label === "Trades").length;
};

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
  await expect(page.getByRole("tab", { name: "Chart" })).toBeVisible();
});

test("dragging a tab to the center of another tabset stacks it there", async ({ page }) => {
  const chart = await page.locator('[data-dashfoo="tabset"]').first().boundingBox();
  if (!chart) {
    throw new Error("no chart tabset box");
  }

  await dragTabTo(page, "Trades", chart.x + chart.width / 2, chart.y + chart.height / 2);

  // poll past dnd-kit's drop animation before asserting the settled model.
  await expect.poll(() => tradesCount(page)).toBe(1);
  const tabs = await tabsByTabset(page);
  expect(tabs[0]).toContain("Trades");
});

test("dragging a tab to the left edge of a tabset splits it into a new tabset", async ({
  page,
}) => {
  const chart = await page.locator('[data-dashfoo="tabset"]').first().boundingBox();
  if (!chart) {
    throw new Error("no chart tabset box");
  }
  const initial = await tabsByTabset(page);
  const before = initial.length;

  await dragTabTo(page, "Trades", chart.x + chart.width * 0.08, chart.y + chart.height / 2);

  // settle past the drop animation, then assert the split created one new tabset.
  await expect.poll(() => tradesCount(page)).toBe(1);
  await expect.poll(() => tabsByTabset(page).then((tabs) => tabs.length)).toBe(before + 1);
});

test("clicking a tab still selects it (the drag sensor does not hijack the click)", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Depth" }).click();

  await expect(page.getByRole("tab", { name: "Depth" })).toHaveAttribute("aria-selected", "true");
});

test("a dock indicator appears while dragging over a tabset and clears after drop", async ({
  page,
}) => {
  const chart = await page.locator('[data-dashfoo="tabset"]').first().boundingBox();
  const box = await page.getByRole("tab", { name: "Trades" }).boundingBox();
  if (!chart || !box) {
    throw new Error("missing boxes");
  }
  const indicator = page.locator('[data-dashfoo="dock-indicator"]');
  await expect(indicator).toHaveCount(0);

  const leftX = chart.x + chart.width * 0.06;
  const midY = chart.y + chart.height / 2;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 8);
  await page.mouse.move(leftX, midY, { steps: 16 });
  await page.mouse.move(leftX, midY); // settle so the throttled onDragMove lands here
  await page.waitForTimeout(80);

  await expect(indicator).toBeVisible();
  // it should highlight the chart tabset's left half (split-left), not the
  // tabset the drag started in nor the whole tabset (center).
  const indicatorBox = await indicator.boundingBox();
  expect(indicatorBox?.x ?? Infinity).toBeLessThan(chart.x + 40);
  expect(indicatorBox?.width ?? Infinity).toBeLessThan(chart.width * 0.7);

  await page.mouse.up();
  await expect(indicator).toHaveCount(0);
});

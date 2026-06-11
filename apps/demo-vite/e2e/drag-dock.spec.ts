import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const tabsByTabset = (page: Page): Promise<Array<Array<string | null>>> =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-dashfoo="tabset"]')].map((tabset) =>
      [...tabset.querySelectorAll('[data-dashfoo="tab"]')].map((tab) => tab.textContent),
    ),
  );

const tasksCount = async (page: Page): Promise<number> => {
  const tabs = await tabsByTabset(page);
  return tabs.flat().filter((label) => label === "Tasks").length;
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
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("dragging a tab to the center of another tabset stacks it there", async ({ page }) => {
  const canvas = await page.locator('[data-dashfoo="tabset"]').first().boundingBox();
  if (!canvas) {
    throw new Error("no canvas tabset box");
  }

  await dragTabTo(page, "Tasks", canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);

  // poll past dnd-kit's drop animation before asserting the settled model.
  await expect.poll(() => tasksCount(page)).toBe(1);
  const tabs = await tabsByTabset(page);
  expect(tabs[0]).toContain("Tasks");
});

test("dropping a tab onto another tabset's tab strip stacks it there (not a split)", async ({
  page,
}) => {
  const first = page.locator('[data-dashfoo="tabset"]').first();
  const strip = await first.locator('[data-dashfoo="tabstrip"]').boundingBox();
  if (!strip) {
    throw new Error("no tab strip box");
  }

  // drop onto the canvas tab strip (right of its existing tabs)
  await dragTabTo(page, "Tasks", strip.x + strip.width - 24, strip.y + strip.height / 2);

  await expect.poll(() => tasksCount(page)).toBe(1);
  // it should join the canvas tabset, keeping 3 tabsets (a split would make 4)
  await expect.poll(() => tabsByTabset(page).then((tabs) => tabs.length)).toBe(3);
  const tabs = await tabsByTabset(page);
  expect(tabs[0]).toContain("Tasks");
});

test("dragging a tab to the left edge of a tabset splits it into a new tabset", async ({
  page,
}) => {
  const canvas = await page.locator('[data-dashfoo="tabset"]').first().boundingBox();
  if (!canvas) {
    throw new Error("no canvas tabset box");
  }
  const initial = await tabsByTabset(page);
  const before = initial.length;

  await dragTabTo(page, "Tasks", canvas.x + canvas.width * 0.08, canvas.y + canvas.height / 2);

  // settle past the drop animation, then assert the split created one new tabset.
  await expect.poll(() => tasksCount(page)).toBe(1);
  await expect.poll(() => tabsByTabset(page).then((tabs) => tabs.length)).toBe(before + 1);
});

test("clicking a tab still selects it (the drag sensor does not hijack the click)", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Detail" }).click();

  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");
});

test("a dock indicator appears while dragging over a tabset and clears after drop", async ({
  page,
}) => {
  const canvas = await page.locator('[data-dashfoo="tabset"]').first().boundingBox();
  const box = await page.getByRole("tab", { name: "Tasks" }).boundingBox();
  if (!canvas || !box) {
    throw new Error("missing boxes");
  }
  const indicator = page.locator('[data-dashfoo="dock-indicator"]');
  await expect(indicator).toHaveCount(0);

  const leftX = canvas.x + canvas.width * 0.06;
  const midY = canvas.y + canvas.height / 2;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 8);
  await page.mouse.move(leftX, midY, { steps: 16 });
  await page.mouse.move(leftX, midY); // settle so the throttled onDragMove lands here
  await page.waitForTimeout(80);

  await expect(indicator).toBeVisible();
  // it should highlight the canvas tabset's left half (split-left), not the
  // tabset the drag started in nor the whole tabset (center).
  const indicatorBox = await indicator.boundingBox();
  expect(indicatorBox?.x ?? Infinity).toBeLessThan(canvas.x + 40);
  expect(indicatorBox?.width ?? Infinity).toBeLessThan(canvas.width * 0.7);

  await page.mouse.up();
  await expect(indicator).toHaveCount(0);
});

test("the stack indicator is a tab-sized ghost in the tab bar", async ({ page }) => {
  const first = page.locator('[data-dashfoo="tabset"]').first();
  const strip = await first.locator('[data-dashfoo="tabstrip"]').boundingBox();
  // a resident of the target strip: the ghost must take the same vertical box
  const neighbor = await first
    .locator('[data-dashfoo="tab-item"]', { hasText: "Canvas" })
    .boundingBox();
  const item = await page
    .locator('[data-dashfoo="tab-item"]', { hasText: "Tasks" })
    .first()
    .boundingBox();
  const box = await page.getByRole("tab", { name: "Tasks" }).boundingBox();
  if (!strip || !neighbor || !item || !box) {
    throw new Error("missing boxes");
  }
  const indicator = page.locator('[data-dashfoo="dock-indicator"]');

  const x = strip.x + strip.width - 24;
  const y = strip.y + strip.height / 2;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 8);
  await page.mouse.move(x, y, { steps: 16 });
  await page.mouse.move(x, y);
  await page.waitForTimeout(80);

  await expect(indicator).toBeVisible();
  const ind = await indicator.boundingBox();
  // a ghost shaped exactly like a tab: the dragged tab-item's width, the target
  // strip's tab-item vertical box — not a thin line, not a strip-height block.
  expect(Math.abs((ind?.width ?? 0) - item.width)).toBeLessThanOrEqual(4);
  expect(Math.abs((ind?.height ?? 0) - neighbor.height)).toBeLessThanOrEqual(2);
  expect(Math.abs((ind?.y ?? 0) - neighbor.y)).toBeLessThanOrEqual(2);
  expect(ind?.x ?? -Infinity).toBeGreaterThanOrEqual(strip.x - 1);
  expect((ind?.x ?? Infinity) + (ind?.width ?? 0)).toBeLessThanOrEqual(strip.x + strip.width + 1);

  await page.mouse.up();
});

test("dropping on a tab-strip slot inserts the tab at that position", async ({ page }) => {
  const detail = await page.getByRole("tab", { name: "Detail" }).boundingBox();
  if (!detail) {
    throw new Error("no Detail tab box");
  }

  // drop on the boundary just left of Detail — index 1, between Canvas and Detail.
  await dragTabTo(page, "Tasks", detail.x + 2, detail.y + detail.height / 2);

  await expect
    .poll(() => tabsByTabset(page).then((tabs) => tabs[0]))
    .toEqual(["Canvas", "Tasks", "Detail"]);
});

test("adjacent widgets are separated by a visible gutter", async ({ page }) => {
  const tabsets = page.locator('[data-dashfoo="tabset"]');
  const canvas = await tabsets.nth(0).boundingBox(); // left
  const activity = await tabsets.nth(1).boundingBox(); // top-right
  const metrics = await tabsets.nth(2).boundingBox(); // bottom-right
  if (!canvas || !activity || !metrics) {
    throw new Error("missing tabset boxes");
  }

  // a real resizable gutter sits between panels, not touching edges (the rrp
  // separator must carry width/height — it collapses to 0 if the theme misses it).
  const horizontalGutter = activity.x - (canvas.x + canvas.width);
  const verticalGutter = metrics.y - (activity.y + activity.height);
  expect(horizontalGutter).toBeGreaterThanOrEqual(12);
  expect(verticalGutter).toBeGreaterThanOrEqual(12);
});

test("reordering a tab within its own tabset ignores the tab being moved", async ({ page }) => {
  const detail = await page.getByRole("tab", { name: "Detail" }).boundingBox();
  if (!detail) {
    throw new Error("no Detail tab box");
  }

  // drag Canvas (the first tab) past Detail in its own strip → [Detail, Canvas].
  await dragTabTo(page, "Canvas", detail.x + detail.width + 12, detail.y + detail.height / 2);

  await expect.poll(() => tabsByTabset(page).then((tabs) => tabs[0])).toEqual(["Detail", "Canvas"]);
});

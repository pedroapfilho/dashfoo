import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// Sizing constraints on the docking layout: tabset "a" sets min: 180, "b" uses
// the engine default.
const aPanel = (page: Page): Locator => page.locator("#a");
const bPanel = (page: Page): Locator => page.locator("#b");
const splitter = (page: Page): Locator => page.locator('[data-dashfoo="splitter"]').first();
const rootGroup = (page: Page): Locator => page.locator('[data-dashfoo="row"]').first();

// The dragged boundary sits at a%/(a%+b%); the splitter gutter is excluded from
// both, so this ratio is exactly rrp's left-panel percentage.
const boundaryRatio = async (page: Page): Promise<number> => {
  const a = await panelWidth(aPanel(page));
  const b = await panelWidth(bPanel(page));
  return a / (a + b);
};

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

test("magnetic snapping pulls the boundary onto the grid (default step 25%)", async ({ page }) => {
  const group = await rootGroup(page).boundingBox();
  if (!group) {
    throw new Error("root group has no bounding box");
  }

  // Release at 53.5% — inside the 4% threshold of the 50% grid line, but far
  // enough off that an un-snapped result (~0.535) is distinguishable from 0.5.
  await dragSplitterTo(page, group.x + group.width * 0.535);

  await expect.poll(() => boundaryRatio(page)).toBeLessThan(0.52);
  await expect.poll(() => boundaryRatio(page)).toBeGreaterThan(0.48);
});

test("the splitter highlights while a snap is engaged and clears on release", async ({ page }) => {
  const group = await rootGroup(page).boundingBox();
  const box = await splitter(page).boundingBox();
  if (!group || !box) {
    throw new Error("splitter or group has no bounding box");
  }
  const y = box.y + box.height / 2;

  // The layout starts 50/50, so drag into a different grid zone (~27%, inside the
  // 4% threshold of the 25% line) to make the boundary actually move and snap.
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(group.x + group.width * 0.27, y, { steps: 16 });

  await expect(splitter(page)).toHaveAttribute("data-dashfoo-snapped", "true");
  // The group arms the glide transition while snapped.
  await expect(rootGroup(page)).toHaveAttribute("data-dashfoo-snapping", "true");

  await page.mouse.up();

  await expect(splitter(page)).not.toHaveAttribute("data-dashfoo-snapped", "true");
  await expect(rootGroup(page)).not.toHaveAttribute("data-dashfoo-snapping", "true");
});

test("with snapping off the boundary stays where it is dropped", async ({ page }) => {
  await page.getByLabel("Snap").selectOption({ label: "Off" });

  const group = await rootGroup(page).boundingBox();
  if (!group) {
    throw new Error("root group has no bounding box");
  }

  await dragSplitterTo(page, group.x + group.width * 0.535);

  // No grid pull, so the boundary lands near 53.5%, well off the 50% line.
  await expect.poll(() => boundaryRatio(page)).toBeGreaterThan(0.52);
});

test("a divisions grid lets the boundary snap to a third", async ({ page }) => {
  await page.getByLabel("Snap").selectOption({ label: "Thirds" });

  const group = await rootGroup(page).boundingBox();
  if (!group) {
    throw new Error("root group has no bounding box");
  }

  // Release at 30% — inside the 4% threshold of the one-third (33.3%) line, which
  // a fixed-percent grid like 25% could never offer.
  await dragSplitterTo(page, group.x + group.width * 0.3);

  await expect.poll(() => boundaryRatio(page)).toBeGreaterThan(0.315);
  await expect.poll(() => boundaryRatio(page)).toBeLessThan(0.352);
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

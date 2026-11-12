import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const bottom = (page: Page): Locator => page.locator('[data-tabset-id="ts-side-bottom"]');

const heightOf = async (locator: Locator): Promise<number> => {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error("element has no bounding box");
  }

  return box.height;
};

const stripHeight = (page: Page): Promise<number> =>
  heightOf(bottom(page).locator('[data-dashfoo="tabstrip"]'));

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ height: 1000, width: 1280 });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.getByRole("tab", { name: "Metrics" })).toBeVisible();
});

test("the collapse button shrinks a tabset to its strip and expands it back", async ({ page }) => {
  const expanded = await heightOf(bottom(page));
  const collapse = bottom(page).getByRole("button", { name: "Collapse" });

  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await collapse.click();

  await expect(bottom(page)).toHaveAttribute("data-collapsed", "column");
  await expect
    .poll(async () => heightOf(bottom(page)))
    .toBeLessThanOrEqual((await stripHeight(page)) + 4);
  await expect(bottom(page).locator('[data-dashfoo="tabcontent"]').first()).toBeHidden();

  await bottom(page).getByRole("button", { name: "Expand" }).click();

  await expect(bottom(page)).not.toHaveAttribute("data-collapsed");
  await expect.poll(() => heightOf(bottom(page))).toBeGreaterThan(expanded - 4);
});

test("clicking a tab of a collapsed tabset expands it", async ({ page }) => {
  await bottom(page).getByRole("button", { name: "Collapse" }).click();
  await expect(bottom(page)).toHaveAttribute("data-collapsed", "column");

  await bottom(page).getByRole("tab", { name: "History" }).click();

  await expect(bottom(page)).not.toHaveAttribute("data-collapsed");
  await expect(bottom(page).getByRole("tab", { name: "History" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("dragging the splitter past the minimum collapses the tabset", async ({ page }) => {
  const splitter = bottom(page).locator(
    "xpath=ancestor::*[@data-panel][1]/preceding-sibling::*[@data-dashfoo='splitter'][1]",
  );

  const box = await splitter.boundingBox();

  if (!box) {
    throw new Error("splitter has no bounding box");
  }

  const viewport = page.viewportSize();
  const x = box.x + box.width / 2;

  await page.mouse.move(x, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, (viewport?.height ?? 1000) - 10, { steps: 20 });
  await page.mouse.up();

  await expect(bottom(page)).toHaveAttribute("data-collapsed", "column");
  await expect(bottom(page).getByRole("button", { name: "Expand" })).toBeVisible();
});

test("a split too short for its minimums collapses the tabset to fit without saving it", async ({
  page,
}) => {
  await page.setViewportSize({ height: 560, width: 1280 });

  await expect(bottom(page)).toHaveAttribute("data-collapsed-to-fit", "true");
  await expect(bottom(page).getByRole("button", { name: "Expand" })).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("dashfoo:demo:overview") ?? ""),
  ).not.toContain('"collapsed"');

  await page.setViewportSize({ height: 1000, width: 1280 });

  await expect(bottom(page)).not.toHaveAttribute("data-collapsed");
});

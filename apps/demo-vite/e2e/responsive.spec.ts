import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const verticalSplitters = (page: Page) =>
  page.locator('[data-separator][aria-orientation="vertical"]').count();

test("the layout stacks below the container breakpoint and restores above it", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.goto("/responsive");
  await expect(page.getByRole("tab", { name: "Chart" }).first()).toBeVisible();

  // wide: the trading terminal is side by side (at least one vertical splitter)
  await expect.poll(() => verticalSplitters(page)).toBeGreaterThan(0);

  // narrow: stackModel kicks in — a single column, no vertical splitters
  await page.setViewportSize({ height: 900, width: 560 });
  await expect.poll(() => verticalSplitters(page)).toBe(0);

  // widen again: the desktop terminal returns
  await page.setViewportSize({ height: 800, width: 1280 });
  await expect.poll(() => verticalSplitters(page)).toBeGreaterThan(0);
});

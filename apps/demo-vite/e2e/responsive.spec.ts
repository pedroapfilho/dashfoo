import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { dragElementOver } from "./helpers/drag";

const columns = (page: Page): Promise<number> =>
  page.locator('[data-dashfoo="tabset"]').evaluateAll((els) => {
    const xs = els.map((el) => Math.round(el.getBoundingClientRect().x));

    return new Set(xs).size;
  });

const tabsByTabset = (page: Page): Promise<Array<Array<string | null>>> =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-dashfoo="tabset"]')].map((tabset) =>
      [...tabset.querySelectorAll('[data-dashfoo="tab"]')].map((tab) => tab.textContent),
    ),
  );

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("stacks into one column and locks drag + resize below the breakpoint", async ({ page }) => {
  expect(await columns(page)).toBeGreaterThan(1);
  await expect(page.getByRole("button", { name: "Move tabset" }).first()).toBeVisible();
  await expect(page.locator('[data-dashfoo="splitter"]').first()).not.toHaveAttribute(
    "data-separator",
    "disabled",
  );

  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);

  await expect(page.getByRole("button", { name: "Move tabset" })).toHaveCount(0);
  await expect(
    page.locator('[data-dashfoo="splitter"]:not([data-separator="disabled"])'),
  ).toHaveCount(0);
});

test("restores the exact desktop arrangement after narrow then widen (no remount)", async ({
  page,
}) => {
  const before = await tabsByTabset(page);
  expect(await columns(page)).toBeGreaterThan(1);

  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);

  await page.setViewportSize({ height: 720, width: 1280 });
  await expect.poll(() => columns(page)).toBeGreaterThan(1);

  expect(await tabsByTabset(page)).toEqual(before);
});

test("the stacked, locked view still selects tabs by tap", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);

  await page.getByRole("tab", { name: "Detail" }).click();
  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");
});

test("compact docking rejects widgets over the strip, body, and edge, then works after widening", async ({
  page,
}) => {
  await page.goto("/docking");
  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);
  const before = await tabsByTabset(page);
  const target = page.locator('[data-dashfoo="tabset"]').first();

  for (const region of ["strip", "body", "edge"]) {
    const element = region === "strip" ? target.locator('[data-dashfoo="tabstrip"]') : target;
    const box = await element.boundingBox();

    if (!box) {
      throw new Error("missing compact drop target");
    }

    await dragElementOver(
      page,
      page.getByTestId("widget-reports"),
      box.x + box.width / 2,
      box.y + box.height * (region === "edge" ? 0.94 : 0.5),
    );
    await expect(page.locator('[data-dashfoo="drag-preview"]')).toBeVisible();
    await expect(page.locator('[data-dashfoo="dock-indicator"]')).toHaveCount(0);
    await page.mouse.up();
    expect(await tabsByTabset(page)).toEqual(before);
  }

  await page.setViewportSize({ height: 720, width: 1280 });
  await expect.poll(() => columns(page)).toBeGreaterThan(1);
  expect(await tabsByTabset(page)).toEqual(before);
  const box = await target.boundingBox();

  if (!box) {
    throw new Error("missing desktop drop target");
  }

  await dragElementOver(
    page,
    page.getByTestId("widget-reports"),
    box.x + box.width / 2,
    box.y + box.height / 2,
  );
  await expect(page.locator('[data-dashfoo="dock-indicator"]')).toBeVisible();
  await page.mouse.up();
  await expect(page.getByRole("tab", { exact: true, name: "Reports" })).toBeVisible();
});

test("a widget gesture started on desktop cannot commit after the compact breakpoint", async ({
  page,
}) => {
  await page.goto("/docking");
  await expect.poll(() => columns(page)).toBeGreaterThan(1);
  const before = await tabsByTabset(page);
  const target = page.locator('[data-dashfoo="tabset"]').first();
  const desktop = await target.boundingBox();

  if (!desktop) {
    throw new Error("missing desktop target");
  }

  await dragElementOver(
    page,
    page.getByTestId("widget-reports"),
    desktop.x + desktop.width / 2,
    desktop.y + desktop.height / 2,
  );
  await expect(page.locator('[data-dashfoo="dock-indicator"]')).toBeVisible();
  await page.setViewportSize({ height: 900, width: 600 });
  await expect.poll(() => columns(page)).toBe(1);
  const compact = await target.boundingBox();

  if (!compact) {
    throw new Error("missing compact target");
  }

  await page.mouse.move(compact.x + compact.width / 2, compact.y + compact.height / 2, {
    steps: 4,
  });
  await expect(page.locator('[data-dashfoo="drag-preview"]')).toBeVisible();
  await expect(page.locator('[data-dashfoo="dock-indicator"]')).toHaveCount(0);
  await page.mouse.up();
  await page.setViewportSize({ height: 720, width: 1280 });
  await expect.poll(() => columns(page)).toBeGreaterThan(1);
  expect(await tabsByTabset(page)).toEqual(before);
});

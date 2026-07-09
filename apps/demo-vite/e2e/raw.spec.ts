import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

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
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 8);
  await page.mouse.move(x, y, { steps: 16 });
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/raw");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("the hand-built composition renders its custom chrome", async ({ page }) => {
  await expect(page.getByText("3 tabs")).toBeVisible();
  await expect(page.getByText("2 tabs")).toBeVisible();
});

test("clicking a tab selects it", async ({ page }) => {
  await page.getByRole("tab", { name: "Detail" }).click();

  await expect(page.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");
});

test("closing a tab removes it and updates the counter", async ({ page }) => {
  await page.getByRole("button", { name: "Close Notes" }).click();

  await expect(page.getByRole("tab", { name: "Notes" })).toHaveCount(0);
  await expect(page.getByText("2 tabs")).toHaveCount(2);
});

test("double-clicking a tab renames it inline", async ({ page }) => {
  await page.getByRole("tab", { name: "Canvas" }).dblclick();
  const input = page.getByRole("textbox");
  await input.fill("Board");
  await input.press("Enter");

  await expect(page.getByRole("tab", { name: "Board" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Canvas" })).toHaveCount(0);
});

test("maximize fills the area; restore brings the other tabset back", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Activity" })).toBeVisible();

  await page.getByRole("button", { name: "Maximize" }).first().click();
  await expect(page.getByRole("tab", { name: "Activity" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("tab", { name: "Activity" })).toBeVisible();
});

test("dragging a tab onto the other tabset docks it there", async ({ page }) => {
  const target = await page.locator('[data-dashfoo="tabset"]').last().boundingBox();
  if (!target) {
    throw new Error("no target tabset box");
  }

  await dragTabTo(page, "Notes", target.x + target.width / 2, target.y + target.height / 2);

  await expect
    .poll(async () => {
      const tabs = await tabsByTabset(page);
      return tabs[1];
    })
    .toContain("Notes");
});

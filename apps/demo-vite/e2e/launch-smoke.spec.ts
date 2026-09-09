import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { dragElementOver } from "./helpers/drag";

test("@smoke docking, split resizing, floats, persistence and keyboard focus", async ({ page }) => {
  await page.goto("/");
  const canvas = page.getByRole("tab", { exact: true, name: "Canvas" });
  await expect(canvas).toBeVisible();
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { exact: true, name: "Detail" })).toBeFocused();
  await page.getByRole("textbox", { name: "Workspace notes" }).fill("Keep this note");
  await canvas.click();
  await page.getByRole("tab", { exact: true, name: "Detail" }).click();
  await expect(page.getByRole("textbox", { name: "Workspace notes" })).toHaveValue(
    "Keep this note",
  );

  const splitter = page.getByRole("separator").first();
  const box = await splitter.boundingBox();
  if (!box) {
    throw new Error("Missing splitter");
  }
  const before = await splitter.getAttribute("aria-valuenow");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 90, box.y + box.height / 2, { steps: 16 });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      }),
  );
  await page.mouse.up();
  await expect(splitter).not.toHaveAttribute("aria-valuenow", before ?? "");

  const target = page
    .locator('[data-dashfoo="tabset"]')
    .filter({ has: page.getByRole("tab", { exact: true, name: "Activity" }) });
  const targetBox = await target.locator('[data-dashfoo="tabstrip"]').boundingBox();
  if (!targetBox) {
    throw new Error("Missing target tabstrip");
  }
  await dragElementOver(page, canvas, targetBox.x + 80, targetBox.y + targetBox.height / 2);
  // WebKit can deliver pointer moves before the collision observer catches up.
  // Releasing against the old target reorders Canvas in its original tabset.
  await expect
    .poll(
      async () => {
        const indicator = await page.locator('[data-dashfoo="dock-indicator"]').boundingBox();
        return (
          indicator !== null &&
          indicator.x >= targetBox.x &&
          indicator.x + indicator.width <= targetBox.x + targetBox.width &&
          Math.abs(indicator.y - targetBox.y) <= 1 &&
          indicator.width <= 6
        );
      },
      { message: "Docking indicator reaches the destination tab strip before release" },
    )
    .toBe(true);
  await page.mouse.up();
  await expect(target.getByRole("tab", { exact: true, name: "Canvas" })).toBeVisible();

  await page.getByRole("button", { exact: true, name: "Float panel" }).first().click();
  await expect(page.locator('[data-dashfoo="float"]')).toHaveCount(1);
  await page.getByRole("button", { exact: true, name: "Minimize panel" }).click();
  await page.locator('[data-dashfoo="float-chip"]').click();
  await page.reload();
  await expect(page.locator('[data-dashfoo="float"]')).toHaveCount(1);
  await page
    .getByRole("button", { exact: true, name: "Dock panel back into the main layout" })
    .click();
  await expect(page.locator('[data-dashfoo="float"]')).toHaveCount(0);
  await page.getByRole("button", { exact: true, name: "Clear saved layout" }).click();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("@smoke compound layout exposes valid tab semantics", async ({ page }) => {
  await page.goto("/raw");
  await expect(page.getByRole("tab", { exact: true, name: "Canvas" })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("closing and renaming the sole remaining tab retains valid names and focus", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { exact: true, name: "Detail" }).click();
  await page.getByRole("button", { exact: true, name: "Close Detail" }).click();
  const canvas = page.getByRole("tab", { exact: true, name: "Canvas" });
  await expect(canvas).toBeFocused();
  await canvas.dblclick();
  const rename = page.getByRole("textbox", { exact: true, name: "Rename Canvas" });
  await expect(rename).toBeFocused();
  const results = await new AxeBuilder({ page })
    .withRules(["aria-required-children", "aria-valid-attr-value"])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(results.incomplete).toEqual([]);
  await expect(page.getByRole("tabpanel", { exact: true, name: "Canvas" })).toBeVisible();
  await rename.press("Escape");
  await expect(canvas).toBeFocused();
});

test("@smoke saved desktop floats fit narrow screens without overwriting geometry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Float panel" }).last().click();
  const float = page.locator('[data-dashfoo="float"]');
  await expect(float).toHaveCSS("transform", "none");
  const wide = await float.boundingBox();
  if (!wide) {
    throw new Error("Missing float");
  }
  await page.setViewportSize({ height: 844, width: 390 });
  await expect
    .poll(async () => {
      const box = await float.boundingBox();
      return (
        box !== null &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= 390 &&
        box.y + box.height <= 844
      );
    })
    .toBe(true);
  await page.reload();
  const dock = page.getByRole("button", { name: "Dock panel back into the main layout" });
  await expect(dock).toBeInViewport();
  await page.setViewportSize({ height: 720, width: 1280 });
  await expect
    .poll(async () => {
      const box = await float.boundingBox();
      return box?.width;
    })
    .toBeCloseTo(wide.width, 0);
  await dock.click();
  await expect(float).toHaveCount(0);
});

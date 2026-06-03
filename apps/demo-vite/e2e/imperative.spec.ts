import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/controlled");
  await expect(page.getByRole("tab", { name: "Chart" })).toBeVisible();
});

test("the imperative handle drives undo/redo with correct history flags", async ({ page }) => {
  const undo = page.getByRole("button", { name: "Undo" });
  const redo = page.getByRole("button", { name: "Redo" });

  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await page.getByRole("tab", { name: "Depth" }).click();
  await expect(page.getByRole("tab", { name: "Depth" })).toHaveAttribute("aria-selected", "true");
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();

  await undo.click();
  await expect(page.getByRole("tab", { name: "Chart" })).toHaveAttribute("aria-selected", "true");
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(page.getByRole("tab", { name: "Depth" })).toHaveAttribute("aria-selected", "true");
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
});

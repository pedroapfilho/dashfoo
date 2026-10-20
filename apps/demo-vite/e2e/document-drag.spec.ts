import { expect, test } from "@playwright/test";

import { dragElementOver } from "./helpers/drag";

for (const distinct of [false, true]) {
  test(`sibling and nested layouts isolate ${distinct ? "different" : "equal"} local ids`, async ({
    page,
  }) => {
    await page.goto(`/e2e/fixtures/documents.html${distinct ? "?distinct" : ""}`);
    await expect(page.getByRole("tab", { exact: true, name: "nested First" })).toBeVisible();
    const ids = await page
      .locator("[id]")
      .evaluateAll((elements) => elements.map((element) => element.id));
    expect(new Set(ids).size).toBe(ids.length);
    await expect(
      page.getByTestId("nested").getByRole("tabpanel", { exact: true, name: "nested First" }),
    ).toBeVisible();
    const right = page.getByTestId("right");
    const target = right.getByRole("tab", { exact: true, name: "right Target" });
    const targetBox = await target.boundingBox();
    if (!targetBox) {
      throw new Error("missing destination strip");
    }
    const before = await page.locator("output").allTextContents();
    for (const name of ["left", "nested"]) {
      for (const source of [
        page.getByRole("tab", { exact: true, name: `${name} Second` }),
        page.getByTestId(name).getByRole("button", { name: "Move tabset" }).last(),
      ]) {
        await dragElementOver(
          page,
          source,
          targetBox.x + targetBox.width / 2,
          targetBox.y + targetBox.height / 2,
        );
        await expect(page.locator('[data-dashfoo="drag-preview"]')).toBeVisible();
        await expect(page.locator('[data-dashfoo="dock-indicator"]')).toHaveCount(0);
        await expect(right.locator("[data-dragging], [data-dragging-source]")).toHaveCount(0);
        await page.mouse.up();
        expect(await page.locator("output").allTextContents()).toEqual(before);
      }
    }
    await dragElementOver(
      page,
      right.getByRole("tab", { exact: true, name: "right Second" }),
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
    );
    await expect(right.locator('[data-dashfoo="dock-indicator"]')).toBeVisible();
    await page.mouse.up();
    await expect(target.locator('xpath=ancestor::*[@data-dashfoo="tabset"]')).toContainText(
      "right Second",
    );
  });
}

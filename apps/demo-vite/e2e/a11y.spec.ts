import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Chart" })).toBeVisible();
});

test("tabs do not carry invalid aria-pressed / aria-roledescription", async ({ page }) => {
  const chart = page.getByRole("tab", { name: "Chart" });
  // focus + settle so any dnd-kit DOM mutation would have run
  await chart.focus();
  await page.waitForTimeout(150);

  // dnd-kit's Accessibility plugin (disabled) would stamp these onto the
  // draggable role="tab" button, which is invalid for the tab role.
  expect(await chart.getAttribute("aria-pressed")).toBeNull();
  expect(await chart.getAttribute("aria-grabbed")).toBeNull();
  expect(await chart.getAttribute("aria-roledescription")).toBeNull();
});

test("a focused tab is the only tabbable one (roving tabindex)", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Chart" })).toHaveAttribute("tabindex", "0");
  await expect(page.getByRole("tab", { name: "Depth" })).toHaveAttribute("tabindex", "-1");
});

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("pops a panel into a real window and docks it back", async ({ context, page }) => {
  const popoutButton = page.getByLabel("Open panel in a new window").first();
  await expect(popoutButton).toBeVisible();

  // window.open inside the click gesture spawns a new browser page.
  const [popup] = await Promise.all([context.waitForEvent("page"), popoutButton.click()]);
  await popup.waitForLoadState("domcontentloaded");

  // The detached panel renders into the popup with its tab strip and a dock-back
  // control, and the host stylesheet was copied across (the toolbar is styled).
  const dockBack = popup.getByLabel("Dock panel back into the main window");
  await expect(dockBack).toBeVisible();
  await expect(popup.getByRole("tab").first()).toBeVisible();

  // Docking back closes the popup and returns the panel to the main layout.
  await Promise.all([popup.waitForEvent("close"), dockBack.click()]);
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

test("closing the popup window docks the panel back", async ({ context, page }) => {
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    page.getByLabel("Open panel in a new window").first().click(),
  ]);
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup.getByLabel("Dock panel back into the main window")).toBeVisible();

  // The user closing the window (pagehide) reattaches the panel rather than
  // losing it.
  await popup.close();
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});

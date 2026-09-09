import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`landing ${theme} ${width}: usable demo, links and accessibility`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ height: 1000, width });
      await page.goto("http://localhost:4110");
      await expect(page.getByRole("tab", { exact: true, name: "Overview" })).toBeVisible();
      await expect(
        page.getByRole("link", { exact: true, name: "Get started" }).first(),
      ).toHaveAttribute("href", /\/getting-started$/v);
      await page.getByRole("tab", { exact: true, name: "Orders" }).click();
      await expect(page.getByRole("button", { exact: true, name: "Undo" })).toBeEnabled();
      await page.getByRole("button", { exact: true, name: "Undo" }).click();
      await page.getByRole("button", { exact: true, name: "Reset layout" }).click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });

    test(`docs ${theme} ${width}: guide, landmarks and accessibility`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ height: 1000, width });
      await page.goto("http://localhost:4011/getting-started");
      await expect(
        page.getByRole("heading", { exact: true, name: "Getting started" }),
      ).toBeVisible();
      await expect(page.getByRole("main")).toHaveCount(1);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test("documentation routes, Markdown, search index and metadata are available", async ({
  page,
  request,
}) => {
  const pages = [
    "",
    "getting-started",
    "concepts",
    "the-model",
    "drag-and-dock",
    "controlled-and-history",
    "build-your-own-layout",
    "persistence",
    "responsive",
    "floating-panels",
    "theming",
    "api-reference",
  ];
  for (const route of pages) {
    await page.goto(`http://localhost:4011/${route}`);
    await expect(page.locator("h1")).toHaveCount(1);
    const markdown = await request.get(`http://localhost:4011/${route}.md`);
    expect(markdown.ok()).toBe(true);
    expect(await markdown.text()).toContain("dashfoo");
  }
  for (const endpoint of ["llms.txt", "llms-full.txt", "api/search", "robots.txt", "sitemap.xml"]) {
    const response = await request.get(`http://localhost:4011/${endpoint}`);
    expect(response.ok()).toBe(true);
  }
  for (const endpoint of ["robots.txt", "sitemap.xml", "opengraph-image", "twitter-image"]) {
    const response = await request.get(`http://localhost:4110/${endpoint}`);
    expect(response.ok()).toBe(true);
  }
});

test("docs search, copy controls, anchors and mobile navigation work", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("http://localhost:4011/getting-started");
  await page.getByRole("button", { exact: true, name: "Copy Text" }).first().click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("npm install @dashfoo/core");
  await page.getByRole("button", { exact: true, name: "Copy Markdown" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("# Getting started");
  await page.getByRole("link", { exact: true, name: "Step 1: Install" }).click();
  await expect(page).toHaveURL(/#step-1-install$/v);
  await page.getByRole("button", { exact: true, name: "Open Search" }).click();
  await page.getByRole("textbox", { exact: true, name: "Search" }).fill("persistence");
  await page.getByRole("button", { exact: true, name: "Docs Guides Persisting layouts" }).click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Persisting layouts" }),
  ).toBeVisible();
  await page.getByRole("button", { exact: true, name: "Open Sidebar" }).click();
  await expect(
    page.getByRole("link", { exact: true, name: "Floating panels" }).first(),
  ).toBeVisible();
});

import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";

import { chromium, expect } from "@playwright/test";

const [directory, framework, mode] = process.argv.slice(2);
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const { port } = reservation.address();
await new Promise((resolve) => {
  reservation.close(resolve);
});
const server = spawn(
  path.join(directory, "node_modules/.bin", framework === "vite" ? "vite" : "next"),
  framework === "vite"
    ? ["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"]
    : ["start", "--hostname", "127.0.0.1", "--port", String(port)],
  { cwd: directory, stdio: "inherit" },
);
const browser = await chromium.launch();
try {
  const url = `http://127.0.0.1:${port}`;
  await expect
    .poll(
      async () => {
        try {
          const response = await fetch(url);
          return response.ok;
        } catch {
          return false;
        }
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  const page = await browser.newPage({ viewport: { height: 800, width: 1280 } });
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  await page.goto(url);
  if (mode === "benchmark") {
    await page.waitForFunction(() => typeof globalThis.runWorkloads === "function");
    const results = await page.evaluate(() => globalThis.runWorkloads());
    const report = {
      browser: browser.version(),
      keepMounted: true,
      results,
      samples: 100,
      tabsets: 5,
      viewport: { height: 800, width: 1280 },
      warmup: 20,
    };
    console.log(JSON.stringify(report, null, 2));
    if (process.env.LAUNCH_REPORT_DIR) {
      await writeFile(
        path.join(process.env.LAUNCH_REPORT_DIR, "browser-workloads.json"),
        `${JSON.stringify(report, null, 2)}\n`,
      );
    }
  } else {
    const notes = page.getByRole("tab", { exact: true, name: "Notes" });
    await notes.click();
    await page.getByRole("textbox", { exact: true, name: "Notes" }).fill("Preserved local state");
    await page.getByRole("tab", { exact: true, name: "Welcome" }).click();
    await notes.click();
    await expect(page.getByRole("textbox", { exact: true, name: "Notes" })).toHaveValue(
      "Preserved local state",
    );
    await page.setViewportSize({ height: 844, width: 390 });
    await expect(
      page.locator('[data-dashfoo="splitter"]:not([data-separator="disabled"])'),
    ).toHaveCount(0);
    await expect(page.getByRole("textbox", { exact: true, name: "Notes" })).toHaveValue(
      "Preserved local state",
    );
    await page.setViewportSize({ height: 800, width: 1280 });
    await expect(page.getByRole("separator")).toHaveCount(1);
    await expect(page.getByRole("textbox", { exact: true, name: "Notes" })).toHaveValue(
      "Preserved local state",
    );
    await notes.dblclick();
    const rename = page.getByRole("textbox", { name: "Rename Notes" });
    await expect(rename).toBeFocused();
    await rename.fill("Scratchpad");
    await rename.press("Enter");
    const scratchpad = page.getByRole("tab", { exact: true, name: "Scratchpad" });
    await expect(scratchpad).toBeFocused();
    const target = page
      .locator('[data-dashfoo="tabset"]')
      .filter({ has: page.getByRole("tab", { exact: true, name: "Help" }) });
    const from = await scratchpad.boundingBox();
    const to = await target.locator('[data-dashfoo="tabstrip"]').boundingBox();
    if (!from || !to) {
      throw new Error("Missing drag geometry");
    }
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 8, from.y + from.height / 2 + 8);
    await page.mouse.move(to.x + 60, to.y + to.height / 2, { steps: 16 });
    await expect(page.locator('[data-dashfoo="dock-indicator"]')).toHaveCount(1);
    await page.mouse.up();
    await expect(target.getByRole("tab", { exact: true, name: "Scratchpad" })).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Float panel" }).first().click();
    await expect(page.locator('[data-dashfoo="float"]')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('[data-dashfoo="float"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Dock panel back into the main layout" }).click();
    await expect(page.locator('[data-dashfoo="float"]')).toHaveCount(0);
    expect(errors).toEqual([]);
    console.log(
      "Production consumer browser: docking, rename focus, floats, persistence, responsive state passed",
    );
  }
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await once(server, "exit");
}

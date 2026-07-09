import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.E2E_PORT ?? "5174";
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  fullyParallel: false,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["list"]],
  retries: 0,
  testDir: "./e2e",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    url: BASE_URL,
  },
});

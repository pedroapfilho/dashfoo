import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.E2E_PORT ?? "5174";
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  fullyParallel: false,
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { grep: /@smoke/v, name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { grep: /@smoke/v, name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  reporter: [["list"]],
  retries: 0,
  testDir: "./e2e",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    url: BASE_URL,
  },
});

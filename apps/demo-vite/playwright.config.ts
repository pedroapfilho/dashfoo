import { defineConfig, devices } from "@playwright/test";

// Port is overridable (E2E_PORT) so a run can dodge a foreign dev server already
// holding the default — `reuseExistingServer` would otherwise load the wrong app.
const PORT = process.env.E2E_PORT ?? "5174";
const BASE_URL = `http://localhost:${PORT}`;

// Drives the demo with real CDP pointer events — the only reliable way to
// exercise dnd-kit's pointer sensor (it ignores untrusted/synthetic events).
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

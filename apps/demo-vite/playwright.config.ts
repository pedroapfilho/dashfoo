import { defineConfig, devices } from "@playwright/test";

// Drives the demo with real CDP pointer events — the only reliable way to
// exercise dnd-kit's pointer sensor (it ignores untrusted/synthetic events).
export default defineConfig({
  fullyParallel: false,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["list"]],
  retries: 0,
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec vite --port 5174 --strictPort",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    url: "http://localhost:5174",
  },
});

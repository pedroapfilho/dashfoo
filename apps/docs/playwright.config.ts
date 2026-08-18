import { defineConfig } from "@playwright/test";

const config = defineConfig({
  retries: 0,
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:4010",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "EXPOSE_TESTING_API=1 pnpm build && EXPOSE_TESTING_API=1 pnpm exec next start -p 4010",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:4010",
  },
  workers: 1,
});

export default config;

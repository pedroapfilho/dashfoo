import { defineConfig } from "@playwright/test";

const port = 4010;
const baseURL = `http://127.0.0.1:${port}`;

const config = defineConfig({
  retries: 0,
  testDir: "./e2e",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${port}`,
    env: { EXPOSE_TESTING_API: "1" },
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
  workers: 1,
});

export default config;

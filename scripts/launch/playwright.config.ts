import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  testMatch: "sites.spec.ts",
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm --filter landing exec next start -p 4110",
      reuseExistingServer: !process.env.CI,
      url: "http://localhost:4110",
    },
    {
      command: "pnpm --filter docs exec next start -p 4011",
      reuseExistingServer: !process.env.CI,
      url: "http://localhost:4011",
    },
  ],
  workers: 1,
});

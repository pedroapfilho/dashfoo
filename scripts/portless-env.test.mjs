import assert from "node:assert/strict";
import test from "node:test";

import { applyPortlessUrls } from "./portless-env.mjs";

await test("resolves scalar and comma-separated Portless URLs", () => {
  const env = {};
  applyPortlessUrls(
    { API_URL: "dashfoo.demo", ORIGINS: ["dashfoo", "dashfoo.docs"] },
    { env, resolveUrl: (name) => `https://branch.${name}.localhost` },
  );
  assert.deepEqual(env, {
    API_URL: "https://branch.dashfoo.demo.localhost",
    ORIGINS: "https://branch.dashfoo.localhost,https://branch.dashfoo.docs.localhost",
  });
});

await test("preserves explicitly configured environment values", () => {
  const env = { API_URL: "https://api.example.com" };
  applyPortlessUrls(
    { API_URL: "dashfoo.demo" },
    {
      env,
      resolveUrl: () => {
        throw new Error("should not resolve an explicit value");
      },
    },
  );
  assert.equal(env.API_URL, "https://api.example.com");
});

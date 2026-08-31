import { spawnSync } from "node:child_process";

import { applyPortlessUrls } from "./portless-env.mjs";

const env = applyPortlessUrls({
  NEXT_PUBLIC_DEMO_URL: ["dashfoo.demo"],
  NEXT_PUBLIC_DOCS_URL: ["dashfoo.docs"],
  NEXT_PUBLIC_WEB_URL: ["dashfoo"],
});

const { status } = spawnSync("pnpm", ["exec", "turbo", "run", "dev"], {
  env,
  stdio: "inherit",
});

process.exit(status ?? 1);

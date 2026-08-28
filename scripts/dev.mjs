import { spawn } from "node:child_process";

import { applyPortlessUrls } from "./portless-env.mjs";

applyPortlessUrls({
  NEXT_PUBLIC_DEMO_URL: "dashfoo.demo",
  NEXT_PUBLIC_DOCS_URL: "dashfoo.docs",
  NEXT_PUBLIC_WEB_URL: "dashfoo",
});

const child = spawn("pnpm", ["exec", "turbo", "dev"], { env: process.env, stdio: "inherit" });
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});

import { defineConfig } from "tsdown";

import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
  clean: false,
  define: { PACKAGE_VERSION: JSON.stringify(packageJson.version) },
  dts: true,
  entry: ["src/index.ts"],
  format: "esm",
  minify: false,
  platform: "browser",
  sourcemap: true,
  target: "es2022",
  treeshake: true,
});

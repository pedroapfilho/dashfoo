import { defineConfig } from "tsdown";

export default defineConfig({
  clean: false,
  dts: true,
  entry: ["src/index.ts"],
  format: "esm",
  minify: true,
  platform: "neutral",
  sourcemap: true,
  target: "es2022",
  treeshake: true,
});

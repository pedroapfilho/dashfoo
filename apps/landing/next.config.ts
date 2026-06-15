import type { NextConfig } from "next";

const config: NextConfig = {
  // portless serves the dev app at <workspace>.dashfoo.localhost, which varies
  // per Conductor workspace — the wildcard allows them all without per-branch edits.
  allowedDevOrigins: ["dashfoo.localhost", "*.dashfoo.localhost"],
  reactStrictMode: true,
  transpilePackages: ["@dashfoo/core", "@dashfoo/react"],
};

export default config;

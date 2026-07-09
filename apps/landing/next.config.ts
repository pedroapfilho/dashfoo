import type { NextConfig } from "next";

const config: NextConfig = {
  allowedDevOrigins: ["dashfoo.localhost", "*.dashfoo.localhost"],
  reactStrictMode: true,
  transpilePackages: ["@dashfoo/core", "@dashfoo/react"],
};

export default config;

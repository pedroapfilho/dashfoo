import type { NextConfig } from "next";

const config: NextConfig = {
  allowedDevOrigins: ["dashfoo.localhost", "*.dashfoo.localhost"],
  reactStrictMode: true,
  transpilePackages: ["@dashfoo/core", "@dashfoo/react"],
  turbopack: {
    rules: {
      "*.{ts,tsx}": {
        // Turbopack rejects Unicode RegExp flags.
        // oxlint-disable-next-line eslint/require-unicode-regexp
        condition: { all: [{ not: "foreign" }, { content: /[Zz]od/ }] },
        loaders: ["zod-compiler/turbopack"],
      },
    },
  },
};

export default config;

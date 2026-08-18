import type { NextConfig } from "next";

const config: NextConfig = {
  allowedDevOrigins: ["dashfoo.localhost", "*.dashfoo.localhost"],
  reactStrictMode: true,
  transpilePackages: ["@dashfoo/core", "@dashfoo/react"],
  turbopack: {
    rules: {
      "*.{ts,tsx}": {
        condition: {
          all: [
            { not: "foreign" },
            // oxlint-disable-next-line eslint/require-unicode-regexp -- Turbopack rejects RegExp flags.
            { content: /[Zz]od/ },
          ],
        },
        loaders: ["zod-compiler/turbopack"],
      },
    },
  },
};

export default config;

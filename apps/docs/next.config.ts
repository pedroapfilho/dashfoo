import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const config: NextConfig = {
  reactStrictMode: true,
  rewrites() {
    return [
      { destination: "/llms.mdx", source: "/index.md" },
      { destination: "/llms.mdx/:path*", source: "/:path*.md" },
    ];
  },
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

export default withMDX(config);

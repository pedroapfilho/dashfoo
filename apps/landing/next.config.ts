import { applyPortlessUrls } from "@repo/portless-env";
import type { NextConfig } from "next";

applyPortlessUrls(["NEXT_PUBLIC_DOCS_URL"]);

const config: NextConfig = {
  headers: () =>
    Promise.resolve([
      {
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
        source: "/:path*",
      },
    ]),
  reactStrictMode: true,
  transpilePackages: ["@dashfoo/core", "@dashfoo/react"],
  turbopack: {
    rules: {
      "*.{ts,tsx}": {
        condition: {
          all: [{ not: "foreign" }, { content: /[Zz]od/ }],
        },
        loaders: ["zod-compiler/turbopack"],
      },
    },
  },
};

export default config;

import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();
const exposeTestingApi = process.env.EXPOSE_TESTING_API === "1";

if (exposeTestingApi) {
  process.emitWarning("The Next.js testing API is enabled. Never deploy this build to production.");
}

const config: NextConfig = {
  cacheComponents: true,
  experimental: {
    exposeTestingApiInProductionBuild: exposeTestingApi,
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  partialPrefetching: true,
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

export default withMDX(config);

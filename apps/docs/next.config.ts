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
};

export default withMDX(config);

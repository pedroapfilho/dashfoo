import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const config: NextConfig = {
  reactStrictMode: true,
  // Serve any docs page as Markdown by appending `.md` (used by the
  // "Copy Markdown" / "View as Markdown" page actions).
  rewrites() {
    return [
      { destination: "/llms.mdx", source: "/index.md" },
      { destination: "/llms.mdx/:path*", source: "/:path*.md" },
    ];
  },
};

export default withMDX(config);

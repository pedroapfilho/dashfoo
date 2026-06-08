import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

// Layout options shared between the docs layout and any home layout. The nav
// title is the dashfoo wordmark — a plain text mark keeps the grayscale,
// hue-free brand and needs no image asset.
export const baseOptions = (): BaseLayoutProps => ({
  githubUrl: GITHUB_URL,
  nav: {
    title: <span className="font-semibold tracking-tight">dashfoo</span>,
    transparentMode: "top",
  },
});

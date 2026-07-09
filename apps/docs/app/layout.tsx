import "@/app/global.css";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  description:
    "Documentation for dashfoo: a headless React docking-layout library with tiled, resizable, tabbed regions, a serializable model, and zero imposed styling.",
  metadataBase: new URL("https://docs.dashfoo.com"),
  title: {
    default: "dashfoo: headless React docking layout",
    template: "%s · dashfoo docs",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { color: "oklch(1 0 0)", media: "(prefers-color-scheme: light)" },
    { color: "oklch(0.145 0 0)", media: "(prefers-color-scheme: dark)" },
  ],
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <body className="flex min-h-screen flex-col">
      {}
      <div
        aria-hidden="true"
        className="reading-progress-bar fixed top-0 left-0 z-50 h-0.5 bg-[--primary] [animation-range:0%_100%]"
        style={{ width: "0%" }}
      />
      <RootProvider search={{ options: { type: "static" } }}>{children}</RootProvider>
    </body>
  </html>
);

export default RootLayout;

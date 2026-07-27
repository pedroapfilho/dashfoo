import "@fontsource-variable/geist-mono/index.css";
import "@/app/global.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

const DESCRIPTION =
  "A headless React docking-layout library: tiled, resizable, tabbed regions with a serializable, zod-validated model and zero imposed styling. Build VS-Code-style dashboards you own.";
const TITLE = "dashfoo: headless React docking layout";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  applicationName: "dashfoo",
  authors: [{ name: "Pedro Filho", url: "https://github.com/pedroapfilho" }],
  category: "technology",
  creator: "Pedro Filho",
  description: DESCRIPTION,
  keywords: [
    "React docking layout",
    "docking library",
    "dashboard layout",
    "resizable panels",
    "drag and drop tabs",
    "tab layout",
    "splitter",
    "headless UI",
    "React dashboard",
    "VS Code layout",
    "serializable layout",
    "dashfoo",
  ],
  metadataBase: new URL("https://dashfoo.com"),
  openGraph: {
    description: DESCRIPTION,
    locale: "en_US",
    siteName: "dashfoo",
    title: TITLE,
    type: "website",
    url: "/",
  },
  publisher: "dashfoo",
  robots: {
    follow: true,
    googleBot: { follow: true, index: true },
    index: true,
  },
  title: {
    default: TITLE,
    template: "%s · dashfoo",
  },
  twitter: {
    card: "summary_large_image",
    description: DESCRIPTION,
    title: TITLE,
  },
};

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("dashfoo:landing:theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.dataset.dashfooTheme="dark";}}catch(e){}})();`;

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html className="antialiased" lang="en" suppressHydrationWarning>
    <head>
      {/* oxlint-disable react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
    </head>
    <body className="bg-dashfoo-background text-dashfoo-foreground font-dashfoo">{children}</body>
  </html>
);

export default RootLayout;

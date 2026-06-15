import "@fontsource-variable/geist-mono/index.css";
import "@/app/global.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

const DESCRIPTION =
  "A headless React docking-layout library: tiled, resizable, tabbed regions with a serializable, zod-validated model and zero imposed styling. Build VS-Code-style dashboards you own.";
const TITLE = "dashfoo: headless React docking layout";

// opengraph-image.tsx / twitter-image.tsx supply the social card automatically,
// so og:image and twitter:image are not set here.
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

export const viewport: Viewport = {
  themeColor: [
    { color: "oklch(1 0 0)", media: "(prefers-color-scheme: light)" },
    { color: "oklch(0.145 0 0)", media: "(prefers-color-scheme: dark)" },
  ],
};

// Set data-dashfoo-theme before first paint so the page and the embedded layout
// never flash the wrong theme. Reads the saved choice, falling back to the OS.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("dashfoo:landing:theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.dataset.dashfooTheme="dark";}}catch(e){}})();`;

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      {/*
       * Must be a raw, parser-blocking inline <script> so it runs before first
       * paint. next/script (even beforeInteractive) only enqueues to __next_s,
       * which is drained by async framework chunks after paint — reintroducing
       * the theme flash this guards against. THEME_SCRIPT is a hardcoded
       * constant with zero attacker-controllable input.
       */}
      {/* oxlint-disable react/no-danger */}
      {/* react-doctor-disable-next-line react-doctor/no-danger, react-doctor/nextjs-no-native-script */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      {/* oxlint-enable react/no-danger */}
    </head>
    <body className="bg-dashfoo-background text-dashfoo-foreground font-dashfoo antialiased">
      {children}
    </body>
  </html>
);

export default RootLayout;

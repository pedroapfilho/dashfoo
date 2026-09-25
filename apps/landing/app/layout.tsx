import "@dashfoo/react/styles.css";
import "@fontsource-variable/geist-mono/index.css";
import "@/app/global.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "./_components/footer";
import { Header } from "./_components/header";

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
  metadataBase: new URL("https://www.dashfoo.com"),
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
      {/* oxlint-disable-next-line react/no-danger -- a static inline script sets the theme before first paint to avoid a flash */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
    </head>
    <body className="bg-background text-foreground isolate flex min-h-dvh flex-col font-sans">
      {/* A sticky header and a 480px interactive demo sit before any prose, so
          keyboard users get a way past both. */}
      <a
        className="rounded-dashfoo bg-primary text-primary-foreground focus:outline-ring sr-only px-4 py-2.5 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-6 focus:z-20 focus:outline-2 focus:outline-offset-2"
        href="#main"
      >
        Skip to content
      </a>
      <Header />
      <main className="flex-1" id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </body>
  </html>
);

export default RootLayout;

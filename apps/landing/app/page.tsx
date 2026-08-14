import type { ReactNode } from "react";

import { Cta } from "./_components/cta";
import { Features } from "./_components/features";
import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { Hero } from "./_components/hero";
import { Quickstart } from "./_components/quickstart";
import { When } from "./_components/when-to-use";

const HomePage = (): ReactNode => (
  <div className="isolate flex min-h-dvh flex-col">
    {/* A sticky header and a 480px interactive demo sit before any prose, so
        keyboard users get a way past both. */}
    <a
      className="rounded-dashfoo bg-primary text-primary-foreground focus:outline-ring sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-6 focus:z-20 focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:outline-2 focus:outline-offset-2"
      href="#main"
    >
      Skip to content
    </a>
    <Header />
    <main className="flex-1" id="main" tabIndex={-1}>
      <Hero />
      <Features />
      <Quickstart />
      <When />
      <Cta />
    </main>
    <Footer />
  </div>
);

export default HomePage;

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
    <Header />
    <main className="flex-1">
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

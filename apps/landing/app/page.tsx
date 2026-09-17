import type { ReactNode } from "react";

import { Cta } from "./_components/cta";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { Quickstart } from "./_components/quickstart";
import { When } from "./_components/when-to-use";

const HomePage = (): ReactNode => (
  <>
    <Hero />
    <Features />
    <Quickstart />
    <When />
    <Cta />
  </>
);

export default HomePage;

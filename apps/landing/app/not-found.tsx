import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ButtonLink } from "./_components/button-link";

export const metadata: Metadata = {
  title: "Page not found",
};

const NotFound = (): ReactNode => (
  <section className="py-20 sm:py-28">
    <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
      <h1 className="max-w-measure-35 text-foreground mx-auto font-mono text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Page not found
      </h1>
      <p className="max-w-measure-56 text-muted-foreground mx-auto mt-4 text-base text-pretty">
        There is no page at this address.
      </p>
      <div className="mt-8 flex justify-center">
        <ButtonLink href="/" variant="primary">
          Back to the homepage
        </ButtonLink>
      </div>
    </div>
  </section>
);

export default NotFound;

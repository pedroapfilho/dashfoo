import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { ButtonLink } from "./button-link";
import { GitHubIcon } from "./github-icon";

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.dashfoo.com";
const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

const Cta = (): ReactNode => (
  <section className="border-border/70 border-t py-20 sm:py-28">
    <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
      <h2 className="text-foreground mx-auto max-w-[35ch] font-mono text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Build the dashboard your product needs
      </h2>
      <p className="text-muted-foreground mx-auto mt-4 max-w-[56ch] text-base text-pretty">
        Install two packages, style the chrome yourself, and ship.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href={DOCS_URL} icon="trailing" variant="primary">
          Get started
          <ArrowRight className="size-4 h-lh shrink-0" strokeWidth={2} />
        </ButtonLink>
        <ButtonLink external href={GITHUB_URL} icon="leading">
          <GitHubIcon className="size-4 h-lh" />
          Star on GitHub
        </ButtonLink>
      </div>
    </div>
  </section>
);

export { Cta };

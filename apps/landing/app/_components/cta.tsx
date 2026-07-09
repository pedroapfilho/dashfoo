import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { GitHubIcon } from "./github-icon";

const DOCS_URL = "https://docs.dashfoo.com";
const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

const Cta = (): ReactNode => (
  <section className="border-dashfoo-border/70 border-t py-20 sm:py-28">
    <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
      <h2 className="text-dashfoo-foreground mx-auto max-w-[24ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Build the dashboard your product needs
      </h2>
      <p className="text-dashfoo-muted-foreground mx-auto mt-4 max-w-[48ch] text-base text-pretty">
        Install two packages, style the chrome yourself, and ship.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          className="bg-dashfoo-primary text-dashfoo-background rounded-dashfoo focus-visible:outline-dashfoo-ring inline-flex items-center gap-2 py-2.5 pr-3 pl-5 text-sm font-medium transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          href={DOCS_URL}
        >
          Get started
          <ArrowRight className="size-4 h-lh shrink-0" strokeWidth={2} />
        </a>
        <a
          className="border-dashfoo-border text-dashfoo-foreground hover:bg-dashfoo-muted rounded-dashfoo focus-visible:outline-dashfoo-ring inline-flex items-center gap-2 border py-2.5 pr-5 pl-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
          href={GITHUB_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          <GitHubIcon className="size-4 h-lh" />
          Star on GitHub
        </a>
      </div>
    </div>
  </section>
);

export { Cta };

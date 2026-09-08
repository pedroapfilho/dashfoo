import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { ButtonLink } from "./button-link";
import { GitHubIcon } from "./github-icon";
import { LiveDemo } from "./live-demo";

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.dashfoo.com";

const Hero = (): ReactNode => (
  <section className="border-border/70 border-b py-12 sm:py-16">
    <div className="mx-auto max-w-6xl px-6 lg:px-8">
      <h1 className="text-foreground max-w-[24ch] font-mono text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
        Docking layouts for React that you own
      </h1>
      <p className="text-muted-foreground mt-5 max-w-[65ch] text-lg text-pretty">
        Build your editor, terminal, or dashboard with tabs, splits, and floating panels. Compose
        the chrome, style it your way, and save the whole layout as JSON.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ButtonLink href={`${DOCS_URL}/getting-started`} icon="trailing" variant="primary">
          Get started <ArrowRight className="size-4" />
        </ButtonLink>
        <ButtonLink external href="https://github.com/pedroapfilho/dashfoo" icon="leading">
          <GitHubIcon className="size-4" /> View on GitHub
        </ButtonLink>
        <p className="text-muted-foreground text-sm">Open source · MIT · early adopter release</p>
      </div>
      <figure className="mt-8">
        <figcaption className="text-muted-foreground mb-3 text-sm">
          A working layout with sample data. Your changes stay in this browser.
        </figcaption>
        <LiveDemo />
      </figure>
    </div>
  </section>
);

export { Hero };

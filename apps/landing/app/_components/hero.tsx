import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { ButtonLink } from "./button-link";
import { GitHubIcon } from "./github-icon";
import { LiveDemo } from "./live-demo";

const DOCS_URL = "https://docs.dashfoo.com";
const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

const Hero = (): ReactNode => (
  <section className="landing-blueprint border-dashfoo-border/70 relative overflow-hidden border-b pt-16 pb-14 sm:pt-24 sm:pb-20">
    <div aria-hidden="true" className="landing-glow absolute inset-0" />
    <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[13fr_7fr] lg:items-end">
        <div>
          <div className="border-dashfoo-border text-dashfoo-muted-foreground inline-flex items-start gap-2 rounded-full border px-3 py-2 text-base sm:text-sm">
            <span className="flex h-lh shrink-0 items-center">
              <span className="bg-dashfoo-primary size-1.5 rounded-full" />
            </span>
            MIT-licensed · headless · zero imposed styling
          </div>
          <h1 className="text-dashfoo-foreground mt-6 max-w-[24ch] text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            Docking layouts for React that you own
          </h1>
          <p className="text-dashfoo-muted-foreground mt-6 max-w-[48ch] text-lg text-pretty">
            dashfoo ships the structure: tabs, splits, drag-dock, and a serializable model. You keep
            the styling, so your dashboards match your product instead of a prebuilt skin.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href={DOCS_URL} icon="trailing" variant="primary">
              Get started
              <ArrowRight className="size-4 h-lh shrink-0" strokeWidth={2} />
            </ButtonLink>
            <ButtonLink external href={GITHUB_URL} icon="leading">
              <GitHubIcon className="size-4 h-lh" />
              View on GitHub
            </ButtonLink>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="rounded-dashfoo border-dashfoo-border bg-dashfoo-card/70 border p-3 shadow-xl"
        >
          <div className="text-dashfoo-muted-foreground flex items-center justify-between px-1 pb-3 text-xs tracking-[0.12em] uppercase">
            <span>layout.model</span>
            <span className="text-dashfoo-primary tabular-nums">04 regions</span>
          </div>
          <div className="border-dashfoo-border rounded-dashfoo-sm grid h-48 grid-cols-[7fr_5fr] gap-1 border p-1">
            <div className="border-dashfoo-primary/60 bg-dashfoo-primary/5 grid grid-rows-[3fr_2fr] gap-1 rounded-sm border p-1">
              <div className="border-dashfoo-border bg-dashfoo-muted/70 rounded-sm border" />
              <div className="border-dashfoo-border bg-dashfoo-card rounded-sm border" />
            </div>
            <div className="grid grid-rows-[2fr_3fr] gap-1">
              <div className="border-dashfoo-border bg-dashfoo-card rounded-sm border" />
              <div className="border-dashfoo-primary/60 bg-dashfoo-primary/5 rounded-sm border" />
            </div>
          </div>
          <div className="text-dashfoo-muted-foreground flex items-center justify-between px-1 pt-3 text-xs">
            <span>tree normalized</span>
            <span className="text-dashfoo-primary">ready to dock</span>
          </div>
        </div>
      </div>

      <figure className="mt-14 sm:mt-16">
        <figcaption className="text-dashfoo-muted-foreground mb-4 max-w-[56ch] text-base text-pretty sm:text-sm">
          Everything here is live. Drag a tab to restack or split, drag a splitter to resize,
          double-click a tab to rename.
        </figcaption>
        <div className="bg-dashfoo-card ring-dashfoo-border overflow-hidden rounded-[min(1.2vw,16px)] shadow-2xl ring-1">
          <div className="border-dashfoo-border text-dashfoo-muted-foreground flex items-center gap-3 border-b px-4 py-3 text-base sm:text-sm">
            <div className="flex gap-2">
              <span className="bg-dashfoo-border size-3 rounded-full" />
              <span className="bg-dashfoo-border size-3 rounded-full" />
              <span className="bg-dashfoo-primary size-3 rounded-full" />
            </div>
            <span>app.yourproduct.com</span>
          </div>
          <div className="bg-dashfoo-background p-3 sm:p-4">
            <div className="h-[420px] sm:h-[480px]">
              <LiveDemo />
            </div>
          </div>
        </div>
      </figure>
    </div>
  </section>
);

export { Hero };

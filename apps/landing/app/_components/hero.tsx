import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { ButtonLink } from "./button-link";
import { GitHubIcon } from "./github-icon";
import { LiveDemo } from "./live-demo";

const DOCS_URL = "https://docs.dashfoo.com";
const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

const Hero = (): ReactNode => (
  <section className="pt-16 pb-12 sm:pt-24 sm:pb-16">
    <div className="mx-auto max-w-6xl px-6 lg:px-8">
      {/* items-start plus an h-lh box on the dot, not items-center: the label
          wraps to two lines at 375px, and centering floats the dot between them. */}
      <div className="border-dashfoo-border text-dashfoo-muted-foreground inline-flex items-start gap-2 rounded-full border px-3 py-1 text-base sm:text-sm">
        <span className="flex h-lh shrink-0 items-center">
          <span className="bg-dashfoo-foreground size-1.5 rounded-full" />
        </span>
        MIT-licensed · headless · zero imposed styling
      </div>
      <h1 className="text-dashfoo-foreground mt-6 max-w-[24ch] text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
        Docking layouts for React that you own
      </h1>
      <p className="text-dashfoo-muted-foreground mt-6 max-w-[48ch] text-lg text-pretty">
        dashfoo ships the structure: tabs, splits, drag-dock, and a serializable model. You keep the
        styling, so your dashboards match your product instead of a prebuilt skin.
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

      <figure className="mt-14 sm:mt-16">
        {/*
         * The caption leads the figure instead of trailing it: it is the only cue
         * that the box is interactive, and below a 480px-tall demo it sat off
         * screen on every viewport that matters.
         */}
        <figcaption className="text-dashfoo-muted-foreground mb-4 max-w-[56ch] text-base text-pretty sm:text-sm">
          Everything here is live. Drag a tab to restack or split, drag a splitter to resize,
          double-click a tab to rename.
        </figcaption>
        <div className="bg-dashfoo-card overflow-hidden rounded-[min(1.2vw,16px)] shadow-xl ring-1 shadow-black/5 ring-black/5 dark:shadow-none dark:ring-white/10">
          <div className="border-dashfoo-border/70 flex items-center gap-3 border-b px-4 py-3 text-base sm:text-sm">
            <div className="flex gap-2">
              <span className="bg-dashfoo-border size-3 rounded-full" />
              <span className="bg-dashfoo-border size-3 rounded-full" />
              <span className="bg-dashfoo-border size-3 rounded-full" />
            </div>
            <span className="text-dashfoo-muted-foreground">app.yourproduct.com</span>
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

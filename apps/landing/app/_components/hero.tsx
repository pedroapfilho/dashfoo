import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { GitHubIcon } from "./github-icon";
import { LiveDemo } from "./live-demo";

const DOCS_URL = "https://docs.dashfoo.com";
const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

const Hero = (): ReactNode => (
  <section className="pt-16 pb-12 sm:pt-24 sm:pb-16">
    <div className="mx-auto max-w-6xl px-6 lg:px-8">
      <div className="border-dashfoo-border text-dashfoo-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
        <span className="bg-dashfoo-foreground size-1.5 rounded-full" />
        MIT-licensed · headless · zero imposed styling
      </div>
      <h1 className="text-dashfoo-foreground mt-6 max-w-[20ch] text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
        Docking layouts for React that you own
      </h1>
      <p className="text-dashfoo-muted-foreground mt-6 max-w-[60ch] text-lg text-pretty">
        dashfoo ships the structure: tabs, splits, drag-dock, and a serializable model. You keep the
        styling, so your dashboards match your product instead of a prebuilt skin.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
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
          View on GitHub
        </a>
      </div>

      <figure className="mt-14 sm:mt-16">
        <div className="border-dashfoo-border bg-dashfoo-card overflow-hidden rounded-[min(1.2vw,16px)] border shadow-xl shadow-black/5 dark:shadow-none">
          <div className="border-dashfoo-border/70 flex items-center gap-2 border-b px-4 py-3">
            <span className="bg-dashfoo-border size-3 rounded-full" />
            <span className="bg-dashfoo-border size-3 rounded-full" />
            <span className="bg-dashfoo-border size-3 rounded-full" />
            <span className="text-dashfoo-muted-foreground ml-3 text-sm">yourterminal.com</span>
          </div>
          <div className="bg-dashfoo-background p-3 sm:p-4">
            {}
            <div className="h-[420px] sm:h-[480px]">
              <LiveDemo />
            </div>
          </div>
        </div>
        <figcaption className="text-dashfoo-muted-foreground mt-4 text-center text-sm">
          Everything here is live. Drag a tab to restack or split, drag a splitter to resize,
          double-click a tab to rename.
        </figcaption>
      </figure>
    </div>
  </section>
);

export { Hero };

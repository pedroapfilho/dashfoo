import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { CodeBlock } from "./code-block";

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.dashfoo.com";

const INSTALL = "pnpm add @dashfoo/core @dashfoo/react";

const USAGE = `import { model, row, tabset, tab } from "@dashfoo/core";
import { DashfooLayout } from "@dashfoo/react";

const layout = model(
  row([
    tabset([tab("chart", "Chart"), tab("depth", "Depth")], { weight: 2 }),
    tabset([tab("book", "Order Book")], { weight: 1 }),
  ]),
);

export const Dashboard = () => (
  <DashfooLayout
    defaultModel={layout}
    factory={(t) => <Panel node={t} />}
  />
);`;

const Quickstart = (): ReactNode => (
  <section className="border-border/70 scroll-mt-20 border-t py-16 sm:py-24" id="quickstart">
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-8 gap-y-10 px-6 lg:grid-cols-2 lg:px-8">
      <div className="lg:pt-4">
        <h2 className="text-foreground max-w-[35ch] font-mono text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Up and running in one component
        </h2>
        <p className="text-muted-foreground mt-4 max-w-[56ch] text-base text-pretty">
          Install the engine and the React layer, give the mount a height, and resolve tab content
          with a registry or a factory. Tab content never lives in the model. That&rsquo;s the whole
          setup.
        </p>
        <a
          className="text-foreground hover:text-muted-foreground focus-visible:outline-ring mt-6 inline-flex items-center gap-1.5 font-mono text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm"
          href={DOCS_URL}
        >
          Read the full guide
          <ArrowRight className="size-4 h-lh shrink-0" strokeWidth={2} />
        </a>
      </div>
      <div className="flex flex-col gap-4">
        <CodeBlock code={INSTALL} lang="bash" />
        <CodeBlock code={USAGE} lang="tsx" />
      </div>
    </div>
  </section>
);

export { Quickstart };

import { Check, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { LibLink, RGL_URL, RRP_URL } from "./lib-link";

const FOR: Array<{ content: ReactNode; key: string }> = [
  {
    content: "You need real docking: drag tabs to stack, split, or dock to an edge.",
    key: "docking",
  },
  {
    content: "You want to own every pixel of the chrome and style raw markup yourself.",
    key: "chrome",
  },
  {
    content: "You want the layout as a serializable model you can save, diff, and restore.",
    key: "model",
  },
  { content: "You want undo/redo and self-healing tree invariants for free.", key: "undo" },
];

const AGAINST: Array<{ content: ReactNode; key: string }> = [
  {
    content: (
      <>
        You need a free 2D grid with absolute x/y/w/h. Reach for{" "}
        <LibLink href={RGL_URL}>react-grid-layout</LibLink>.
      </>
    ),
    key: "grid",
  },
  { content: "You want a turnkey, fully-styled panel UI out of the box.", key: "turnkey" },
  {
    content: (
      <>
        A simple two-pane resizable split is all you need. Use{" "}
        <LibLink href={RRP_URL}>react-resizable-panels</LibLink>.
      </>
    ),
    key: "split",
  },
  {
    content: "You need panels that detach into native windows or float over the layout.",
    key: "detach",
  },
];

const When = (): ReactNode => (
  <section className="border-border/70 scroll-mt-20 border-t py-16 sm:py-24" id="fit">
    <div className="mx-auto max-w-6xl px-6 lg:px-8">
      <h2 className="text-foreground max-w-[35ch] font-mono text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Is dashfoo the right fit?
      </h2>
      <p className="text-muted-foreground mt-4 max-w-[56ch] text-base text-pretty">
        dashfoo is a split/tab tree, not a coordinate canvas. Popout windows, floating panels, and
        nested sub-layouts aren&rsquo;t in v1.
      </p>
      <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
        <div>
          <h3 className="text-foreground font-mono text-base font-medium">
            Reach for dashfoo when…
          </h3>
          <ul className="mt-5 flex flex-col gap-4">
            {FOR.map((item) => (
              <li className="text-foreground flex gap-3 text-base text-pretty" key={item.key}>
                <Check className="stroke-foreground size-5 h-lh shrink-0" strokeWidth={1.75} />
                {item.content}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-muted-foreground font-mono text-base font-medium">
            Reach for something else when…
          </h3>
          <ul className="mt-5 flex flex-col gap-4">
            {AGAINST.map((item) => (
              <li className="text-muted-foreground flex gap-3 text-base text-pretty" key={item.key}>
                <Minus
                  className="stroke-muted-foreground size-5 h-lh shrink-0"
                  strokeWidth={1.75}
                />
                {item.content}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export { When };

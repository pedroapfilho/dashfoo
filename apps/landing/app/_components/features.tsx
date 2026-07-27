import { FileJson, History, Layers, Move, Paintbrush, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { DNDKIT_URL, LibLink, RRP_URL, XSTATE_URL, ZOD_URL } from "./lib-link";

const FEATURES: Array<{ body: ReactNode; icon: LucideIcon; title: string }> = [
  {
    body: "The engine renders markup tagged with data-dashfoo attributes and applies no CSS. Style the chrome to match your product.",
    icon: Paintbrush,
    title: "Headless by design",
  },
  {
    body: "The whole layout is one plain, zod-validated object: your single source of truth. Save it, diff it, restore it, or send it over the wire.",
    icon: FileJson,
    title: "One serializable model",
  },
  {
    body: "Drag a tab to restack, split, reorder, or dock to an edge. Resizable splitters and maximize come built in, pointer-driven, with no config.",
    icon: Move,
    title: "Real drag-docking",
  },
  {
    body: "Undo and redo come for free, and tree invariants self-heal after every action, so the model never drifts into an invalid state.",
    icon: History,
    title: "Undo/redo & self-healing",
  },
  {
    body: "Run it uncontrolled and let dashfoo own the state, or drive the model yourself and persist it to localStorage or your backend.",
    icon: SlidersHorizontal,
    title: "Controlled or not",
  },
  {
    body: (
      <>
        <LibLink href={RRP_URL}>react-resizable-panels</LibLink>,{" "}
        <LibLink href={DNDKIT_URL}>@dnd-kit/dom</LibLink>,{" "}
        <LibLink href={XSTATE_URL}>XState v5</LibLink>, and <LibLink href={ZOD_URL}>zod</LibLink>{" "}
        sit behind adapters. They stay bundled and hidden, so you never import them.
      </>
    ),
    icon: Layers,
    title: "Primitives, hidden",
  },
];

const Features = (): ReactNode => (
  <section className="scroll-mt-20 py-16 sm:py-24" id="features">
    <div className="mx-auto max-w-6xl px-6 lg:px-8">
      <div>
        <h2 className="text-dashfoo-foreground max-w-[35ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          What dashfoo gives you
        </h2>
        <p className="text-dashfoo-muted-foreground mt-4 max-w-[56ch] text-base text-pretty">
          dashfoo gives you FlexLayout&rsquo;s power without the chrome you can&rsquo;t restructure.
          State, mutations, and drag sit behind adapters you never touch.
        </p>
      </div>
      <dl className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title}>
            <dt className="text-dashfoo-foreground flex items-center gap-2.5 text-base font-medium">
              <feature.icon
                className="stroke-dashfoo-muted-foreground size-5 h-lh shrink-0"
                strokeWidth={1.75}
              />
              {feature.title}
            </dt>
            <dd className="text-dashfoo-muted-foreground mt-3 text-base text-pretty">
              {feature.body}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);

export { Features };

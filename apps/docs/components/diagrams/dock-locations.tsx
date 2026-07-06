import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

import { DiagramFigure, MockTabStrip } from "./diagram-figure";

const ZONE_CLASS =
  "flex items-center justify-center rounded-sm border border-dashed bg-fd-muted/50 font-mono text-[10px] text-fd-muted-foreground";

type ThumbProps = {
  children: ReactNode;
  label: string;
};

const Thumb = ({ children, label }: ThumbProps) => (
  <li className="flex flex-col items-center gap-1">
    <div className="bg-fd-background flex aspect-[16/10] w-full overflow-hidden rounded border">
      {children}
    </div>
    <span className="text-fd-muted-foreground font-mono text-[10px]">{label}</span>
  </li>
);

const ThumbStrip = ({ newTab }: { newTab?: boolean }) => (
  <div className="bg-fd-muted flex h-2.5 shrink-0 items-end gap-px border-b px-0.5">
    <span className="bg-fd-background h-1.5 w-3 rounded-t-xs" />
    <span className="bg-fd-background/60 h-1.5 w-3 rounded-t-xs" />
    {newTab ? <span className="bg-fd-primary/50 h-1.5 w-3 rounded-t-xs" /> : null}
  </div>
);

const ThumbPane = ({ newTab }: { newTab?: boolean }) => (
  <div className="flex grow basis-0 flex-col">
    <ThumbStrip newTab={newTab} />
    <div className="grow" />
  </div>
);

const DockLocations = () => (
  <DiagramFigure
    caption="The five dock locations over a tabset. In the real hit-test the seams between zones run diagonally from each corner, so in a corner the nearer edge wins; dropping on the tab strip itself is also a center drop, inserted at the pointed-at slot."
    label="The five dock locations over a tabset"
  >
    <div className="mx-auto max-w-md min-w-72">
      <MockTabStrip tabs={[{ name: "Canvas", selected: true }, { name: "Detail" }]} />
      <div className="bg-fd-background grid aspect-[16/10] grid-cols-[1fr_2.2fr_1fr] grid-rows-[1fr_2fr_1fr] gap-1 rounded-b-md border border-t-0 p-1">
        <div className={cn(ZONE_CLASS, "row-span-3")}>split-left</div>
        <div className={ZONE_CLASS}>split-top</div>
        <div className={cn(ZONE_CLASS, "row-span-3")}>split-right</div>
        <div className="flex flex-col items-center justify-center gap-0.5 rounded-sm">
          <span className="font-mono text-[11px]">center</span>
          <span className="text-fd-muted-foreground text-[10px]">stack into the tab strip</span>
        </div>
        <div className={ZONE_CLASS}>split-bottom</div>
      </div>
    </div>

    <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
      <Thumb label="center">
        <ThumbPane newTab />
      </Thumb>
      <Thumb label="split-left">
        <div className="bg-fd-primary/10 flex grow basis-0" />
        <div className="bg-fd-border w-px shrink-0" />
        <ThumbPane />
      </Thumb>
      <Thumb label="split-right">
        <ThumbPane />
        <div className="bg-fd-border w-px shrink-0" />
        <div className="bg-fd-primary/10 flex grow basis-0" />
      </Thumb>
      <Thumb label="split-top">
        <div className="flex grow flex-col">
          <div className="bg-fd-primary/10 grow basis-0" />
          <div className="bg-fd-border h-px shrink-0" />
          <ThumbPane />
        </div>
      </Thumb>
      <Thumb label="split-bottom">
        <div className="flex grow flex-col">
          <ThumbPane />
          <div className="bg-fd-border h-px shrink-0" />
          <div className="bg-fd-primary/10 grow basis-0" />
        </div>
      </Thumb>
    </ul>
  </DiagramFigure>
);

export { DockLocations };

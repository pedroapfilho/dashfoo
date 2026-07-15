import type { ReactNode } from "react";

import { DiagramFigure, Gutter, IdChip, Marker, MockTabStrip } from "./diagram-figure";

type LegendItemProps = {
  children: ReactNode;
  n: number;
  term: string;
};

const LegendItem = ({ children, n, term }: LegendItemProps) => (
  <li className="flex items-start gap-2">
    <Marker className="mt-px" n={n} />
    <span>
      <span className="text-fd-foreground font-medium">{term}</span>: {children}
    </span>
  </li>
);

const LayoutAnatomy = () => (
  <DiagramFigure
    caption="The demo's overview layout, plus one floating panel and one minimized chip. The grey badges are node ids. The same ids appear in the model tree below."
    label="Anatomy of a dashfoo layout"
  >
    <div
      aria-hidden
      className="bg-fd-secondary/50 relative flex aspect-[16/10] min-w-105 overflow-hidden rounded-md border p-1.5"
    >
      <div className="bg-fd-background flex grow-[2] basis-0 flex-col overflow-hidden rounded-sm border">
        <MockTabStrip tabs={[{ name: "Canvas", selected: true }, { name: "Detail" }]}>
          <Marker className="mb-1 ml-1" n={1} />
          <span className="mb-1 ml-auto flex items-center gap-1 pl-1">
            <Marker n={2} />
            <IdChip>ts-main</IdChip>
          </span>
        </MockTabStrip>
        <div className="flex grow items-start justify-center pt-5">
          <Marker n={3} />
        </div>
      </div>

      <Gutter orientation="vertical">
        <Marker className="absolute top-9 left-1/2 -translate-x-1/2" n={5} />
        <Marker className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" n={4} />
      </Gutter>

      <div className="flex grow basis-0 flex-col">
        <div className="bg-fd-background flex grow basis-0 flex-col overflow-hidden rounded-sm border">
          <MockTabStrip tabs={[{ name: "Activity", selected: true }, { name: "Tasks" }]}>
            <span className="mb-1 ml-auto pl-1">
              <IdChip>ts-side-top</IdChip>
            </span>
          </MockTabStrip>
          <div className="grow" />
        </div>
        <Gutter orientation="horizontal">
          <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1">
            <Marker n={6} />
            <IdChip>right</IdChip>
          </span>
        </Gutter>
        <div className="bg-fd-background flex grow basis-0 flex-col overflow-hidden rounded-sm border">
          <MockTabStrip
            tabs={[{ name: "Metrics", selected: true }, { name: "History" }, { name: "Reports" }]}
          >
            <span className="mb-1 ml-auto pl-1">
              <IdChip>ts-side-bottom</IdChip>
            </span>
          </MockTabStrip>
          <div className="grow" />
        </div>
      </div>

      <div className="bg-fd-popover absolute bottom-7 left-5 flex w-2/5 flex-col overflow-hidden rounded-md border shadow-lg">
        <div className="bg-fd-muted flex items-center justify-between border-b px-1.5 py-0.5">
          <span className="text-[10px] font-medium">Notes</span>
          <Marker n={7} />
        </div>
        <MockTabStrip tabs={[{ name: "Scratch", selected: true }]} />
        <div className="h-9" />
      </div>

      <div className="bg-fd-popover absolute right-2 bottom-1.5 flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2 shadow-sm">
        <span className="text-[9px]">Console</span>
        <Marker n={8} />
      </div>
    </div>

    <ol className="text-fd-muted-foreground mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
      <LegendItem n={1} term="Tab">
        one document: a <code>component</code> registry key plus a <code>name</code> label (
        <code>TabNode</code>). Tabs are the leaves of the tree.
      </LegendItem>
      <LegendItem n={2} term="Tab strip">
        the row of tab buttons on a tabset; renderer chrome (
        <code>data-dashfoo=&quot;tabstrip&quot;</code>), not a node.
      </LegendItem>
      <LegendItem n={3} term="Tabset / pane">
        a tab strip plus one visible body; <code>selected</code> picks the visible tab (
        <code>TabsetNode</code>).
      </LegendItem>
      <LegendItem n={4} term="Splitter / gutter">
        the draggable resize handle between the children of a row.
      </LegendItem>
      <LegendItem n={5} term="Root row">
        the whole tiled area; <code>orientation: &quot;row&quot;</code> lays its children
        left-to-right (<code>RowNode</code>).
      </LegendItem>
      <LegendItem n={6} term="Nested row">
        a row inside a row; <code>orientation: &quot;column&quot;</code> stacks its two tabsets
        top-to-bottom.
      </LegendItem>
      <LegendItem n={7} term="Floating panel">
        a window-like panel above the grid with its own layout subtree and pixel{" "}
        <code>geometry</code> (<code>FloatNode</code>).
      </LegendItem>
      <LegendItem n={8} term="Minimized chip">
        a floating panel collapsed to a pill docked at the layout edge (<code>minimized: true</code>
        ).
      </LegendItem>
    </ol>
  </DiagramFigure>
);

export { LayoutAnatomy };

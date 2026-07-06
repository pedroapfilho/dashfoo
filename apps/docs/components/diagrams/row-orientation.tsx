import type { ReactNode } from "react";

import { DiagramFigure, Gutter } from "./diagram-figure";

const MiniPane = ({ label }: { label: string }) => (
  <div className="bg-fd-background flex grow basis-0 flex-col overflow-hidden rounded-sm border">
    <div className="bg-fd-muted h-2.5 shrink-0 border-b" />
    <div className="text-fd-muted-foreground flex grow items-center justify-center font-mono text-[11px]">
      {label}
    </div>
  </div>
);

type VariantProps = {
  children: ReactNode;
  detail: string;
  orientation: "column" | "row";
};

const Variant = ({ children, detail, orientation }: VariantProps) => (
  <div>
    <div
      aria-hidden
      className={`bg-fd-secondary/50 flex aspect-[16/10] overflow-hidden rounded-md border p-1 ${
        orientation === "column" ? "flex-col" : ""
      }`}
    >
      {children}
    </div>
    <p className="text-fd-foreground mt-2 text-center font-mono text-[11px]">
      orientation: &quot;{orientation}&quot;
    </p>
    <p className="text-fd-muted-foreground text-center text-xs">{detail}</p>
  </div>
);

const RowOrientation = () => (
  <DiagramFigure
    caption="The same two children under the two orientations. Nesting a column row inside a row (and vice versa) is how any grid of panes is built."
    label="Row orientation: row versus column"
  >
    <div className="mx-auto grid max-w-lg gap-4 sm:grid-cols-2">
      <Variant detail="children flow left-to-right; the splitter is vertical" orientation="row">
        <MiniPane label="A" />
        <Gutter orientation="vertical" />
        <MiniPane label="B" />
      </Variant>
      <Variant
        detail="children stack top-to-bottom; the splitter is horizontal"
        orientation="column"
      >
        <MiniPane label="A" />
        <Gutter orientation="horizontal" />
        <MiniPane label="B" />
      </Variant>
    </div>
  </DiagramFigure>
);

export { RowOrientation };

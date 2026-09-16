import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

type DiagramFigureProps = {
  caption: ReactNode;
  children: ReactNode;
  className?: string;
  label: string;
};

const DiagramFigure = ({ caption, children, className, label }: DiagramFigureProps) => (
  <figure
    aria-label={label}
    className={cn("not-prose bg-docs-card my-6 overflow-x-auto rounded-lg border p-4", className)}
  >
    {children}
    <figcaption className="text-docs-muted-foreground mt-3 text-xs">{caption}</figcaption>
  </figure>
);

type MarkerProps = {
  className?: string;
  n: number;
};

const Marker = ({ className, n }: MarkerProps) => (
  <span
    className={cn(
      "bg-docs-primary text-docs-primary-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
      className,
    )}
  >
    {n}
  </span>
);

type IdChipProps = {
  children: ReactNode;
  className?: string;
};

const IdChip = ({ children, className }: IdChipProps) => (
  <span
    className={cn(
      "bg-docs-muted text-docs-muted-foreground rounded border px-1 font-mono text-xs leading-4 whitespace-nowrap",
      className,
    )}
  >
    {children}
  </span>
);

type MockTabProps = {
  name: string;
  selected?: boolean;
};

const MockTab = ({ name, selected }: MockTabProps) => (
  <span
    className={cn(
      "flex items-center gap-1 rounded-t px-1.5 py-0.5 text-xs whitespace-nowrap",
      selected === true ? "bg-docs-background text-docs-foreground" : "text-docs-muted-foreground",
    )}
  >
    {name}
    <span className="text-xs opacity-60">×</span>
  </span>
);

type MockTabStripProps = {
  children?: ReactNode;
  className?: string;
  tabs: Array<MockTabProps>;
};

const MockTabStrip = ({ children, className, tabs }: MockTabStripProps) => (
  <div className={cn("bg-docs-muted flex items-end gap-0.5 border-b px-1 pt-1", className)}>
    {tabs.map(({ name, selected }) => (
      <MockTab key={name} name={name} selected={selected} />
    ))}
    {children}
  </div>
);

type GutterProps = {
  children?: ReactNode;
  className?: string;
  orientation: "horizontal" | "vertical";
};

const Gutter = ({ children, className, orientation }: GutterProps) => (
  <div
    className={cn(
      "bg-docs-border relative shrink-0",
      orientation === "vertical" ? "w-1.5 self-stretch" : "h-1.5",
      className,
    )}
  >
    {children}
  </div>
);

export { DiagramFigure, Gutter, IdChip, Marker, MockTabStrip };

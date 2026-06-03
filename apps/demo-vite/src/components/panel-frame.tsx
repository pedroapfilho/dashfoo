import type { ReactNode } from "react";

// The shared chrome for a panel's content: a titled header (optional LIVE badge)
// over a scrolling body. Neutral throughout.
const PanelFrame = ({
  children,
  live = false,
  title,
}: {
  children: ReactNode;
  live?: boolean;
  title: string;
}): ReactNode => (
  <div className="flex h-full flex-col">
    <div className="border-df-border flex items-baseline justify-between gap-2 border-b px-3.5 py-2.5">
      <span className="text-df-text text-xs font-semibold tracking-wide">{title}</span>
      {live ? (
        <span className="text-df-muted rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] tracking-wider uppercase">
          live
        </span>
      ) : null}
    </div>
    <div className="min-h-0 flex-1 overflow-auto p-3.5">{children}</div>
  </div>
);

export { PanelFrame };

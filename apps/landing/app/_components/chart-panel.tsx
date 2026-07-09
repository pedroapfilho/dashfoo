import type { ReactNode } from "react";

const CHART_BARS = [42, 68, 55, 80, 47, 92, 61, 74, 38, 86, 70, 58] as const;

const ChartPanel = (): ReactNode => (
  <div className="flex h-full flex-col gap-3">
    <div className="flex items-baseline justify-between">
      <span className="text-dashfoo-foreground text-lg font-semibold tabular-nums">$48,210</span>
      <span className="text-dashfoo-muted-foreground text-[11px]">last 12 weeks</span>
    </div>
    <div className="flex min-h-0 flex-1 items-end gap-1.5">
      {CHART_BARS.map((h, i) => (
        <div
          className="bg-dashfoo-accent flex-1 rounded-t-sm"
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  </div>
);

export { ChartPanel };

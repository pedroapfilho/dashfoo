import type { TabNode } from "@dashfoo/core";
import { Panel } from "@dashfoo/react";
import type { ReactNode } from "react";

// Stable, deterministic bar heights — no Math.random so SSR and client agree.
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

const ORDERS = [
  { id: "#A-1042", status: "Filled", value: "$1,280" },
  { id: "#A-1041", status: "Pending", value: "$640" },
  { id: "#A-1040", status: "Filled", value: "$2,115" },
  { id: "#A-1039", status: "Filled", value: "$905" },
] as const;

const TablePanel = (): ReactNode => (
  <table className="w-full border-collapse text-[11px]">
    <thead>
      <tr className="text-dashfoo-muted-foreground text-left">
        <th className="pb-2 font-medium">Order</th>
        <th className="pb-2 font-medium">Status</th>
        <th className="pb-2 text-right font-medium">Value</th>
      </tr>
    </thead>
    <tbody className="text-dashfoo-foreground">
      {ORDERS.map((o) => (
        <tr className="border-dashfoo-border border-t" key={o.id}>
          <td className="py-1.5 font-mono">{o.id}</td>
          <td className="py-1.5">{o.status}</td>
          <td className="py-1.5 text-right tabular-nums">{o.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ACTIVITY = [
  "Layout saved to localStorage",
  "Tab “Orders” docked right",
  "Splitter resized → 62 / 38",
  "Panel “Activity” maximized",
] as const;

const ActivityPanel = (): ReactNode => (
  <ul className="flex flex-col gap-2.5 text-[11px]">
    {ACTIVITY.map((line) => (
      <li className="flex items-center gap-2" key={line}>
        <span className="bg-dashfoo-accent size-1.5 shrink-0 rounded-full" />
        <span className="text-dashfoo-muted-foreground">{line}</span>
      </li>
    ))}
  </ul>
);

const SNIPPET = `<DashfooLayout
  defaultModel={model}
  factory={renderPanel}
  persist="my-app"
/>`;

const CodePanel = (): ReactNode => (
  <pre className="text-dashfoo-muted-foreground overflow-auto font-mono text-[11px] leading-relaxed">
    {SNIPPET}
  </pre>
);

const PANELS: Record<string, () => ReactNode> = {
  activity: ActivityPanel,
  chart: ChartPanel,
  code: CodePanel,
  table: TablePanel,
};

// The factory DashfooLayout calls per tab. Switches on the tab's component key.
const renderPanel = (node: TabNode): ReactNode => {
  const Body = PANELS[node.component] ?? ChartPanel;
  return (
    <Panel.Root>
      <Panel.Header>
        <Panel.Title>{node.name}</Panel.Title>
      </Panel.Header>
      <Panel.Body>
        <Body />
      </Panel.Body>
    </Panel.Root>
  );
};

export { renderPanel };

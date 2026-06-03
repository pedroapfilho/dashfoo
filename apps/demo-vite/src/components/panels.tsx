import type { TabNode } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";

import { useChartSeries, useOrderBook, usePositions, useTrades } from "../data/feed";

import { PanelFrame } from "./panel-frame";
import { SignedValue } from "./signed-value";

type PanelProps = { node: TabNode };

const Row = ({ label, value }: { label: ReactNode; value: ReactNode }): ReactNode => (
  <div className="text-df-muted flex justify-between gap-4 text-xs">
    <span>{label}</span>
    <span className="text-df-text tabular-nums">{value}</span>
  </div>
);

const ChartPanel = ({ node }: PanelProps): ReactNode => {
  const series = useChartSeries();
  const last = series.length - 1;
  const line = series.map((v, i) => `${(i / last) * 100},${40 - (v / 100) * 40}`).join(" ");
  return (
    <PanelFrame live title={node.name}>
      <svg className="h-full min-h-32 w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
        <polygon fill="rgba(255,255,255,0.05)" points={`0,40 ${line} 100,40`} />
        <polyline fill="none" points={line} stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
      </svg>
    </PanelFrame>
  );
};

const DepthPanel = ({ node }: PanelProps): ReactNode => {
  const { asks, bids } = useOrderBook();
  return (
    <PanelFrame live title={node.name}>
      <div className="flex flex-col gap-1">
        {[...asks, ...bids].map((row, index) => (
          <div className="flex items-center gap-2" key={`${row.price}-${index}`}>
            <div
              className="h-3 rounded-xs bg-white/10"
              style={{ width: `${30 + (index % 3) * 22}%` }}
            />
            <span className="text-df-muted text-[11px] tabular-nums">{row.price}</span>
          </div>
        ))}
      </div>
    </PanelFrame>
  );
};

const BookPanel = ({ node }: PanelProps): ReactNode => {
  const { asks, bids } = useOrderBook();
  return (
    <PanelFrame live title={node.name}>
      <div className="flex flex-col gap-1.5">
        {asks.map((row, index) => (
          <Row key={`a${index}`} label={row.price} value={row.size} />
        ))}
        <div className="border-df-border my-1 border-t" />
        {bids.map((row, index) => (
          <Row key={`b${index}`} label={row.price} value={row.size} />
        ))}
      </div>
    </PanelFrame>
  );
};

const TradesPanel = ({ node }: PanelProps): ReactNode => {
  const trades = useTrades();
  return (
    <PanelFrame live title={node.name}>
      <div className="flex flex-col gap-1.5">
        {trades.map((trade, index) => (
          <Row key={index} label={trade.price} value={trade.size} />
        ))}
      </div>
    </PanelFrame>
  );
};

const PositionsPanel = ({ node }: PanelProps): ReactNode => {
  const positions = usePositions();
  return (
    <PanelFrame live title={node.name}>
      <div className="flex flex-col gap-1.5">
        {positions.map((position) => (
          <Row
            key={position.symbol}
            label={position.symbol}
            value={<SignedValue display={position.display} value={position.pnl} />}
          />
        ))}
      </div>
    </PanelFrame>
  );
};

const TEXT_CONTENT: Record<string, Array<string>> = {
  balances: ["BTC   1.284", "ETH   18.40", "USDC  42,910"],
  console: ["› build finished in 1.2s", "› 0 errors · 0 warnings", "› watching for changes…"],
  explorer: ["src/", "  router.tsx", "  pages/", "package.json", "vite.config.ts"],
  files: ["README.md", "index.html", "src/main.tsx", "src/index.css"],
  notes: ["Drag a tab onto another panel to stack it.", "Drag to an edge to split or dock."],
  orders: ["Limit buy   0.50", "Stop sell   0.25"],
  outline: ["# Overview", "## Layout model", "## Docking", "## Persistence"],
  problems: ["No problems detected."],
  terminal: ["$ pnpm dev", "VITE ready in 240 ms", "➜ local: http://localhost:5174/"],
};

const GenericPanel = ({ node }: PanelProps): ReactNode => {
  const lines = TEXT_CONTENT[node.component] ?? [`${node.name} panel`];
  return (
    <PanelFrame title={node.name}>
      <div className="text-df-muted flex flex-col gap-1 font-mono text-[11px] leading-relaxed">
        {lines.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    </PanelFrame>
  );
};

// Registry passed to every DashfooLayout. Market components get bespoke panels;
// everything else falls back to a neutral text panel keyed by component name.
const panelComponents: Record<string, ComponentType<PanelProps>> = {
  book: BookPanel,
  chart: ChartPanel,
  depth: DepthPanel,
  positions: PositionsPanel,
  trades: TradesPanel,
};

const resolvePanel = (component: string): ComponentType<PanelProps> =>
  panelComponents[component] ?? GenericPanel;

// The factory every page hands to DashfooLayout: resolve a panel by component
// name, falling back to the neutral text panel.
const renderPanel = (tab: TabNode): ReactNode => {
  const Panel = resolvePanel(tab.component);
  return <Panel node={tab} />;
};

export { renderPanel, resolvePanel };
export type { PanelProps };

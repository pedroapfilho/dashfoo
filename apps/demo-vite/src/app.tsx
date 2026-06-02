import type { Dashfoo, TabNode } from "@dashfoo/core";
import { DashfooLayout } from "@dashfoo/react";

const initialModel: Dashfoo = {
  activeTabsetId: "ts-chart",
  borders: [],
  global: { splitterSize: 6 },
  layout: {
    children: [
      {
        children: [
          { component: "chart", id: "chart", name: "Chart", type: "tab" },
          { component: "depth", id: "depth", name: "Depth", type: "tab" },
        ],
        id: "ts-chart",
        selected: 0,
        type: "tabset",
        weight: 2,
      },
      {
        children: [
          {
            children: [
              { component: "book", id: "book", name: "Order Book", type: "tab" },
              { component: "trades", id: "trades", name: "Trades", type: "tab" },
            ],
            id: "ts-book",
            selected: 0,
            type: "tabset",
            weight: 1,
          },
          {
            children: [
              { component: "positions", id: "positions", name: "Positions", type: "tab" },
              { component: "orders", id: "orders", name: "Orders", type: "tab" },
              { component: "balances", id: "balances", name: "Balances", type: "tab" },
            ],
            id: "ts-positions",
            selected: 0,
            type: "tabset",
            weight: 1,
          },
        ],
        id: "right",
        orientation: "column",
        type: "row",
        weight: 1,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
};

const ROWS: Record<string, Array<[string, string]>> = {
  balances: [
    ["BTC", "1.284"],
    ["ETH", "18.40"],
    ["USDC", "42,910"],
  ],
  book: [
    ["64,210.5", "0.84"],
    ["64,208.0", "1.92"],
    ["64,205.5", "0.31"],
  ],
  orders: [
    ["Limit buy", "0.50"],
    ["Stop sell", "0.25"],
  ],
  positions: [
    ["BTC-PERP", "+2.4%"],
    ["ETH-PERP", "-0.8%"],
  ],
  trades: [
    ["64,209.0", "0.12"],
    ["64,207.5", "0.40"],
  ],
};

const isChart = (component: string): boolean => component === "chart" || component === "depth";

const DemoPanel = ({ tab }: { tab: TabNode }) => (
  <div className="flex h-full flex-col" data-panel-content={tab.component}>
    <div className="border-df-border flex items-baseline justify-between gap-2 border-b px-3.5 py-2.5">
      <span className="text-df-text text-xs font-semibold tracking-wide">{tab.name}</span>
      <span className="bg-df-accent/10 text-df-accent rounded-full px-1.5 py-0.5 text-[10px] tracking-wider uppercase">
        live
      </span>
    </div>
    <div className="min-h-0 flex-1 overflow-auto p-3.5">
      {isChart(tab.component) ? (
        <div className="border-df-border from-df-accent/15 h-full min-h-30 rounded-lg border bg-linear-to-b to-transparent" />
      ) : (
        <div className="flex flex-col gap-1.5 tabular-nums">
          {(ROWS[tab.component] ?? []).map(([label, value], index) => (
            <div className="text-df-muted flex justify-between text-xs" key={label}>
              <span>{label}</span>
              <span className={index % 2 === 0 ? "text-df-positive" : "text-df-negative"}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const renderPanel = (tab: TabNode) => <DemoPanel tab={tab} />;

const App = () => <DashfooLayout defaultModel={initialModel} factory={renderPanel} />;

export { App };

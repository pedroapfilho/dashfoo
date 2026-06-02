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

const DemoPanel = ({ tab }: { tab: TabNode }) => (
  <div data-panel-content={tab.component} style={{ height: "100%", padding: 16 }}>
    <h2 style={{ fontSize: 14, margin: 0 }}>{tab.name}</h2>
    <p style={{ color: "#6b7280", fontSize: 12 }}>{`Panel: ${tab.component}`}</p>
  </div>
);

const renderPanel = (tab: TabNode) => <DemoPanel tab={tab} />;

const App = () => <DashfooLayout defaultModel={initialModel} factory={renderPanel} />;

export { App };

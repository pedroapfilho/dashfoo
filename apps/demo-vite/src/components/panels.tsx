import type { TabNode } from "@dashfoo/core";
import type { ComponentType, ReactNode } from "react";

import { BookPanel } from "./book-panel";
import { ChartPanel } from "./chart-panel";
import { DepthPanel } from "./depth-panel";
import { GenericPanel } from "./generic-panel";
import type { PanelProps } from "./panel-types";
import { PositionsPanel } from "./positions-panel";
import { TradesPanel } from "./trades-panel";

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

export { renderPanel };

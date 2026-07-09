import type { TabNode } from "@dashfoo/core";
import { Panel } from "@dashfoo/react";
import type { ReactNode } from "react";

import { ActivityPanel } from "./activity-panel";
import { ChartPanel } from "./chart-panel";
import { CodePanel } from "./code-panel";
import { TablePanel } from "./table-panel";

const PANELS: Record<string, () => ReactNode> = {
  activity: ActivityPanel,
  chart: ChartPanel,
  code: CodePanel,
  table: TablePanel,
};

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

import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";

import { renderPanel } from "../components/panels";
import { DemoStage } from "../components/ui";
import { tradingModel } from "../models";

const OverviewPage = (): ReactNode => (
  <DemoStage
    description="A dense, real-world layout. Drag tabs to restack or split, drag a splitter to resize, double-click a tab to rename, and use the maximize button to focus a panel. Data streams via TanStack Query."
    title="Trading terminal"
  >
    <DashfooLayout defaultModel={tradingModel()} factory={renderPanel} />
  </DemoStage>
);

export { OverviewPage };

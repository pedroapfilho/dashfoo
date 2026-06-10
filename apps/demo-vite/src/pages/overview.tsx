import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";

import { renderPanel } from "../components/panels";
import { DemoStage } from "../components/ui";
import { overviewModel } from "../models";

const OverviewPage = (): ReactNode => (
  <DemoStage
    description="A composite layout. Drag tabs to restack or split, drag splitters to resize, double-click to rename, maximize to focus."
    title="Overview"
  >
    <DashfooLayout defaultModel={overviewModel()} factory={renderPanel} />
  </DemoStage>
);

export { OverviewPage };

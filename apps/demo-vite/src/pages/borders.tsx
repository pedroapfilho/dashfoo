import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";

import { renderPanel } from "../components/panels";
import { DemoStage } from "../components/ui";
import { bordersModel } from "../models";

const BordersPage = (): ReactNode => (
  <DemoStage
    description="Edge panels dock to the frame like an IDE's activity bar and console. Click a strip button to open or collapse its drawer. Drag any tab to the outer gutter to dock it as a new border."
    title="Borders & edges"
  >
    <DashfooLayout defaultModel={bordersModel()} factory={renderPanel} />
  </DemoStage>
);

export { BordersPage };

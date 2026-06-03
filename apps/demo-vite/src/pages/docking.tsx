import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useState } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { dockingModel } from "../models";

const DockingPage = (): ReactNode => {
  const [resetKey, setResetKey] = useState(0);

  const handleReset = (): void => {
    setResetKey((value) => value + 1);
  };

  return (
    <DemoStage
      actions={<Button onClick={handleReset}>Reset layout</Button>}
      description="Drag a tab onto another tab strip to stack it (an insertion line shows where it lands). Drag toward a tabset edge to split. Drag within a strip to reorder, or drag a tabset by its grip to move the whole panel."
      title="Docking & drag"
    >
      <DashfooLayout defaultModel={dockingModel()} factory={renderPanel} key={resetKey} />
    </DemoStage>
  );
};

export { DockingPage };

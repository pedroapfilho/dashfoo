import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { renderPanel } from "../components/panels";
import { DemoStage } from "../components/ui";
import { collapsibleModel } from "../models";

const CollapsiblePage = (): ReactNode => {
  const defaultModel = useMemo(() => collapsibleModel(), []);

  return (
    <DemoStage
      description="The sidebar collapses to a narrow rail when resized below its minimum, and the expanded width is restored when it opens again."
      title="Collapsible panels"
    >
      <DashfooLayout
        defaultModel={defaultModel}
        factory={renderPanel}
        persist="dashfoo:demo:collapsible"
      />
    </DemoStage>
  );
};

export { CollapsiblePage };

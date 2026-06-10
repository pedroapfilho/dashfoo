import { stackModel } from "@dashfoo/core";
import { DashfooLayout, useResponsiveModel } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { renderPanel } from "../components/panels";
import { DemoStage } from "../components/ui";
import { overviewModel } from "../models";

const ResponsivePage = (): ReactNode => {
  const base = useMemo(() => overviewModel(), []);
  const breakpoints = useMemo(
    () => [
      { id: "mobile", model: stackModel(base), query: { maxWidth: 720 } },
      { id: "desktop", model: base },
    ],
    [base],
  );
  const { containerRef, defaultModel, key } = useResponsiveModel({ breakpoints });

  return (
    <DemoStage
      description="The layout adapts to its container's width (ResizeObserver). Below 720px it switches to a single stacked column via stackModel; widen it and the desktop layout returns. Resize the window to see the switch."
      title="Responsive"
    >
      <div className="h-full min-h-0" ref={containerRef}>
        <DashfooLayout defaultModel={defaultModel} factory={renderPanel} key={key} />
      </div>
    </DemoStage>
  );
};

export { ResponsivePage };

import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { renderPanel } from "../components/panels";
import { DemoStage } from "../components/ui";
import { sizingModel } from "../models";

const SizingPage = (): ReactNode => {
  const defaultModel = useMemo(() => sizingModel(), []);

  return (
    <DemoStage
      description="Panels keep practical minimum widths while splitters resize the available space."
      title="Panel sizing"
    >
      <DashfooLayout
        defaultModel={defaultModel}
        factory={renderPanel}
        persist="dashfoo:demo:sizing"
      />
    </DemoStage>
  );
};

export { SizingPage };

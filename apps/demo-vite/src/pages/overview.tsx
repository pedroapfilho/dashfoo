import type { DashfooHandle } from "@dashfoo/react";
import { DashfooLayout } from "@dashfoo/react";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef } from "react";

import { Button, DemoStage } from "../components/demo-stage";
import { PlaceholderPanel } from "../components/placeholder-panel";
import { overviewModel } from "../models";

const OverviewPage = (): ReactNode => {
  const defaultModel = useMemo(() => overviewModel(), []);
  const layout = useRef<DashfooHandle>(null);
  const handleClear = (): void => layout.current?.resetLayout();

  return (
    <DemoStage
      actions={
        <Button icon={<Trash2 size={14} />} onClick={handleClear}>
          Clear saved layout
        </Button>
      }
      description="A composite layout. Drag tabs to restack or split, drag splitters to resize, double-click to rename, maximize to focus, or float a panel into a movable, resizable overlay. Every change is saved to localStorage; reload and your arrangement survives. Clear it to return to the default."
      title="Overview"
    >
      <DashfooLayout
        defaultModel={defaultModel}
        factory={PlaceholderPanel}
        floatable
        persist="dashfoo:demo:overview"
        ref={layout}
        responsive={{ maxWidth: 720 }}
      />
    </DemoStage>
  );
};

export { OverviewPage };

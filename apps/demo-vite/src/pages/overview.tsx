import type { DashfooHandle } from "@dashfoo/react";
import { DashfooLayout } from "@dashfoo/react";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef } from "react";

import { Button, DemoStage } from "../components/demo-stage";
import { renderOverviewPanel } from "../components/overview-panels";
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
      description={
        <>
          <span className="min-[721px]:hidden">
            Tap tabs in the stacked workspace. Open Detail for notes that survive tab switches.{" "}
          </span>
          <span className="hidden min-[721px]:inline">
            Drag tabs, resize splits, or float a panel. Open Detail for notes that survive tab
            switches.{" "}
          </span>
          Sample data; your layout saves in this browser.
        </>
      }
      title="Overview"
    >
      <DashfooLayout
        defaultModel={defaultModel}
        factory={renderOverviewPanel}
        floatable
        keepMounted
        persist="dashfoo:demo:overview"
        ref={layout}
        responsive={{ maxWidth: 720 }}
      />
    </DemoStage>
  );
};

export { OverviewPage };

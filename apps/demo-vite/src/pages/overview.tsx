import type { TabNode } from "@dashfoo/core";
import type { DashfooHandle, PersistInput } from "@dashfoo/react";
import { DashfooLayout } from "@dashfoo/react";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef } from "react";

import { Button, DemoStage } from "../components/demo-stage";
import { OverviewPanel } from "../components/overview-panel";
import { COMPACT, overviewModel } from "../models";

/** Layouts saved before the notes widget became `detail` still restore. */
const upgradeTab = (tab: TabNode): TabNode =>
  tab.component === "notes" ? { ...tab, component: "detail" } : tab;

const PERSIST: PersistInput = { key: "dashfoo:demo:overview", mapTab: upgradeTab };

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
        factory={OverviewPanel}
        floatable
        keepMounted="activity"
        persist={PERSIST}
        ref={layout}
        responsive={COMPACT}
      />
    </DemoStage>
  );
};

export { OverviewPage };

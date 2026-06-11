import { stackModel } from "@dashfoo/core";
import { DashfooLayout, useResponsiveModel } from "@dashfoo/react";
import { Lock, LockOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { overviewModel } from "../models";

// Starts locked so the static state is the first thing the page shows; the
// toggle proves `editable` flips at runtime without remounting the layout.
// A static dashboard still adapts to its container: useResponsiveModel stacks
// the layout into a single column when the stage gets narrow.
const StaticLayoutPage = (): ReactNode => {
  const base = useMemo(() => overviewModel(), []);
  const breakpoints = useMemo(
    () => [
      { id: "stacked", model: stackModel(base), query: { maxWidth: 720 } },
      { id: "wide", model: base },
    ],
    [base],
  );
  const { containerRef, defaultModel, key } = useResponsiveModel({ breakpoints });
  const [editable, setEditable] = useState(false);

  const handleToggle = (): void => {
    setEditable((value) => !value);
  };

  return (
    <DemoStage
      actions={
        <Button
          icon={editable ? <Lock size={14} /> : <LockOpen size={14} />}
          onClick={handleToggle}
        >
          {editable ? "Lock editing" : "Unlock editing"}
        </Button>
      }
      description="editable={false} freezes the arrangement: no tab or tabset dragging, no closing or renaming, and the splitters stop resizing while keeping their size. Switching tabs and maximizing a tabset still work — the dashboard stays usable as a viewer. The layout stays responsive: under 720px the model stacks into a single column via useResponsiveModel. Toggle the lock to flip the prop at runtime; the layout is not remounted."
      title="Static layout"
    >
      <div className="h-full" ref={containerRef}>
        <DashfooLayout
          defaultModel={defaultModel}
          editable={editable}
          factory={renderPanel}
          key={key}
        />
      </div>
    </DemoStage>
  );
};

export { StaticLayoutPage };

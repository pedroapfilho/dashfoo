import { DashfooLayout } from "@dashfoo/react";
import { Lock, LockOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { overviewModel } from "../models";

// Starts locked so the static state is the first thing the page shows; the
// toggle proves `editable` flips at runtime without remounting the layout.
// A static dashboard still adapts to its container: the `responsive` prop stacks
// the layout into a single column and locks drag + resize when the stage gets
// narrow, restoring the desktop arrangement intact when it widens again.
const StaticLayoutPage = (): ReactNode => {
  const defaultModel = useMemo(() => overviewModel(), []);
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
      description="editable={false} freezes the arrangement: no tab or tabset dragging, no closing or renaming, and the splitters stop resizing while keeping their size. Switching tabs and maximizing a tabset still work — the dashboard stays usable as a viewer. The layout stays responsive: under 720px the responsive prop stacks the model into a single column and locks drag and resize, then restores the wide arrangement intact when the stage widens — the layout is never remounted."
      title="Static layout"
    >
      <DashfooLayout
        defaultModel={defaultModel}
        editable={editable}
        factory={renderPanel}
        responsive={{ maxWidth: 720 }}
      />
    </DemoStage>
  );
};

export { StaticLayoutPage };

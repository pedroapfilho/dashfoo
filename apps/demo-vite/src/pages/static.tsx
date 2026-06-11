import { DashfooLayout } from "@dashfoo/react";
import { Lock, LockOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { overviewModel } from "../models";

// Starts locked so the static state is the first thing the page shows; the
// toggle proves `editable` flips at runtime without remounting the layout.
const StaticLayoutPage = (): ReactNode => {
  const initial = useMemo(() => overviewModel(), []);
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
      description="editable={false} freezes the arrangement: no tab or tabset dragging, no closing or renaming, and the splitters stop resizing while keeping their size. Switching tabs and maximizing a tabset still work — the dashboard stays usable as a viewer. Toggle the lock to flip the prop at runtime; the layout is not remounted."
      title="Static layout"
    >
      <DashfooLayout defaultModel={initial} editable={editable} factory={renderPanel} />
    </DemoStage>
  );
};

export { StaticLayoutPage };

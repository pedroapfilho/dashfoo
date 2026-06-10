import type { DashfooHandle } from "@dashfoo/react";
import { DashfooLayout } from "@dashfoo/react";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { playgroundModel } from "../models";

const PersistencePage = (): ReactNode => {
  const defaultModel = useMemo(() => playgroundModel(), []);
  const layout = useRef<DashfooHandle>(null);
  const handleClear = (): void => layout.current?.resetLayout();

  return (
    <DemoStage
      actions={
        <Button icon={<Trash2 size={14} />} onClick={handleClear}>
          Clear saved layout
        </Button>
      }
      description="This layout is saved to localStorage on every change (validated on load). Rearrange it, then reload the page — your arrangement survives. Clear it to return to the default."
      title="Persistence"
    >
      <DashfooLayout
        defaultModel={defaultModel}
        factory={renderPanel}
        persist="dashfoo:demo:persistence"
        ref={layout}
      />
    </DemoStage>
  );
};

export { PersistencePage };

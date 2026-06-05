import { DashfooLayout, usePersistedModel } from "@dashfoo/react";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { playgroundModel } from "../models";

const PersistencePage = (): ReactNode => {
  const defaultModel = useMemo(() => playgroundModel(), []);
  const persisted = usePersistedModel({ defaultModel, key: "dashfoo:demo:persistence" });
  const handleClear = persisted.clear;
  const handleModelChange = persisted.onModelChange;

  return (
    <DemoStage
      actions={
        <Button icon={<Trash2 size={14} />} onClick={handleClear}>
          Clear saved layout
        </Button>
      }
      description="This layout is saved to localStorage on every change (validated and version-migrated). Rearrange it, then reload the page — your arrangement survives. Clear it to return to the default."
      title="Persistence"
    >
      <DashfooLayout
        defaultModel={persisted.defaultModel}
        factory={renderPanel}
        key={persisted.resetKey}
        onModelChange={handleModelChange}
      />
    </DemoStage>
  );
};

export { PersistencePage };

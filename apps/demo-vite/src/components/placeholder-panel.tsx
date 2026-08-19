import type { TabNode } from "@dashfoo/core";
import { Panel } from "@dashfoo/react";
import type { ReactNode } from "react";

const PlaceholderPanel = (node: TabNode): ReactNode => (
  <Panel.Root>
    <Panel.Header>
      <Panel.Title>{node.name}</Panel.Title>
    </Panel.Header>
    <Panel.Body>
      <div className="flex flex-col gap-2">
        <div className="bg-dashfoo-muted h-2 w-4/5 rounded-full" />
        <div className="bg-dashfoo-muted h-2 w-3/5 rounded-full" />
        <div className="bg-dashfoo-muted h-2 w-2/5 rounded-full" />
        <p className="text-dashfoo-muted-foreground mt-2 text-xs">
          Placeholder panel; drag this tab to rearrange the layout.
        </p>
      </div>
    </Panel.Body>
  </Panel.Root>
);

export { PlaceholderPanel };

import type { TabNode } from "@dashfoo/core";
import { Panel } from "@dashfoo/react";
import type { ReactNode } from "react";

// Every tab renders the same content-light placeholder: a titled panel with
// skeleton bars, keeping the demos about the layout, not the content.
const PlaceholderPanel = ({ node }: { node: TabNode }): ReactNode => (
  <Panel.Root>
    <Panel.Header>
      <Panel.Title>{node.name}</Panel.Title>
    </Panel.Header>
    <Panel.Body>
      <div className="flex flex-col gap-2">
        <div className="h-2 w-4/5 rounded-full bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-2 w-3/5 rounded-full bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-2 w-2/5 rounded-full bg-neutral-100 dark:bg-neutral-800" />
        <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
          Placeholder panel — drag this tab to rearrange the layout.
        </p>
      </div>
    </Panel.Body>
  </Panel.Root>
);

// The factory every page hands to DashfooLayout.
const renderPanel = (tab: TabNode): ReactNode => <PlaceholderPanel node={tab} />;

export { renderPanel };

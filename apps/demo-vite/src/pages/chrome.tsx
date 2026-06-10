import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";

import { renderPanel } from "../components/panels";
import { DemoStage } from "../components/ui";
import { chromeModel } from "../models";

const OPERATIONS = [
  ["Close", "The ✕ on a tab removes it; an emptied tabset disappears."],
  ["Rename", "Double-click a tab name to edit it inline; Enter commits, Escape cancels."],
  [
    "Maximize",
    "The button at the strip's trailing edge fills the area with one tabset; click again to restore.",
  ],
] as const;

const ChromePage = (): ReactNode => (
  <DemoStage
    description="Every tab carries a close control and an inline rename editor; every tabset has a maximize toggle. All of it is headless — these are styled purely from data-dashfoo hooks."
    title="Tabset chrome"
  >
    <div className="flex h-full min-h-0 flex-col gap-3">
      <dl className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
        {OPERATIONS.map(([term, detail]) => (
          <div className="rounded-lg border border-neutral-200 bg-white p-3" key={term}>
            <dt className="text-xs font-semibold text-neutral-900">{term}</dt>
            <dd className="mt-1 text-[11px] leading-relaxed text-neutral-500">{detail}</dd>
          </div>
        ))}
      </dl>
      <div className="min-h-0 flex-1">
        <DashfooLayout defaultModel={chromeModel()} factory={renderPanel} />
      </div>
    </div>
  </DemoStage>
);

export { ChromePage };

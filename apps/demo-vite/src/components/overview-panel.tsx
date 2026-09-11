import type { TabNode } from "@dashfoo/core";
import { Panel } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useState } from "react";

const Notes = (): ReactNode => {
  const [notes, setNotes] = useState("");
  return (
    <label className="flex h-full flex-col gap-3 text-sm">
      Notes: switch tabs and come back; your text stays here.
      <textarea
        aria-label="Workspace notes"
        className="min-h-24 flex-1 resize-y rounded-md border border-neutral-300 bg-transparent p-3 dark:border-neutral-600"
        onChange={(event) => {
          setNotes(event.target.value);
        }}
        placeholder="Try typing something…"
        value={notes}
      />
      <span className="text-xs text-neutral-600 dark:text-neutral-300">
        keepMounted preserves local state when switching tabs. Widget content is not saved in the
        layout.
      </span>
    </label>
  );
};

const JOBS = [
  { latency: "42 ms", name: "Search index", status: "Healthy" },
  { latency: "183 ms", name: "Build queue", status: "Running" },
  { latency: "26 ms", name: "Event stream", status: "Healthy" },
];

const Services = (): ReactNode => (
  <table className="w-full text-left text-sm">
    <caption className="mb-3 text-left text-xs text-neutral-600 dark:text-neutral-300">
      Sample service data
    </caption>
    <thead>
      <tr>
        <th className="pb-3">Service</th>
        <th>Status</th>
        <th>Latency</th>
      </tr>
    </thead>
    <tbody>
      {JOBS.map((job) => (
        <tr className="border-t border-neutral-200 dark:border-neutral-700" key={job.name}>
          <td className="py-3">{job.name}</td>
          <td>{job.status}</td>
          <td className="tabular-nums">{job.latency}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const renderOverviewBody = (node: TabNode): ReactNode => {
  if (node.component === "detail") {
    return <Notes />;
  }
  if (node.component === "canvas" || node.component === "metrics") {
    return <Services />;
  }
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-neutral-600 dark:text-neutral-300">
        Sample workspace · {node.name}
      </p>
      <p>Deploy preview ready for review.</p>
      <p>Search index refreshed with 128 documents.</p>
      <p>Open Detail to try a stateful notes panel.</p>
    </div>
  );
};

const OverviewPanel = (node: TabNode): ReactNode => (
  <Panel.Root>
    <Panel.Header>
      <Panel.Title>{node.name}</Panel.Title>
    </Panel.Header>
    <Panel.Body>{renderOverviewBody(node)}</Panel.Body>
  </Panel.Root>
);

export { OverviewPanel };

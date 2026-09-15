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
        className="border-border-strong dark:border-border-inverse min-h-24 flex-1 resize-y rounded-md border bg-transparent p-3"
        onChange={(event) => {
          setNotes(event.target.value);
        }}
        placeholder="Try typing something…"
        value={notes}
      />
      <span className="text-foreground-subtle dark:text-foreground-pale text-xs">
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
    <caption className="text-foreground-subtle dark:text-foreground-pale mb-3 text-left text-xs">
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
        <tr
          className="border-border-default dark:border-border-inverse-subtle border-t"
          key={job.name}
        >
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
      <p className="text-foreground-subtle dark:text-foreground-pale text-xs">
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

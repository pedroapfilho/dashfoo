import { model, row, tab, tabset } from "@dashfoo/core";
import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useState } from "react";

const layout = model(
  row(
    [
      tabset([tab("welcome", "Welcome"), tab("notes", "Notes")], { id: "main" }),
      tabset([tab("help", "Help")], { id: "side" }),
    ],
    { id: "root" },
  ),
);

const Notes = (): ReactNode => {
  const [text, setText] = useState("");
  return (
    <label>
      Notes
      <textarea
        aria-label="Notes"
        onChange={(event) => {
          setText(event.target.value);
        }}
        value={text}
      />
    </label>
  );
};

const components = {
  help: () => (
    <p>On narrow screens, tap tabs in the stacked layout. Your arrangement survives a reload.</p>
  ),
  notes: Notes,
  welcome: () => <p>Drag a tab to split or stack. Use the float control to lift a panel out.</p>,
};

const Dashboard = (): ReactNode => (
  <main style={{ height: "100dvh" }}>
    <DashfooLayout
      components={components}
      defaultModel={layout}
      floatable
      keepMounted
      persist="dashfoo:starter"
      responsive={{ maxWidth: 720 }}
    />
  </main>
);

export { Dashboard };

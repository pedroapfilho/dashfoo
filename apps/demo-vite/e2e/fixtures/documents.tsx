/// <reference types="vite/client" />

import "@dashfoo/react/styles.css";
import "@dashfoo/theme/dashfoo.css";
import "./documents.css";

import type { TabNode } from "@dashfoo/core";
import { model, row, tab, tabset } from "@dashfoo/core";
import { DashfooDragProvider, DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { createRoot } from "react-dom/client";

const renderContent = (node: TabNode): ReactNode => <p>{node.name} content</p>;

const Document = ({
  factory = renderContent,
  name,
  nested = false,
  prefix = "",
}: {
  factory?: (node: TabNode) => ReactNode;
  name: string;
  nested?: boolean;
  prefix?: string;
}): ReactNode => {
  const [value, setValue] = useState(() =>
    model(
      row(
        [
          tabset(
            [
              tab(nested ? "nested" : "probe", `${name} First`, { id: `${prefix}t1` }),
              tab("probe", `${name} Second`, { id: `${prefix}t2` }),
            ],
            { id: `${prefix}ts1` },
          ),
          tabset([tab("probe", `${name} Target`, { id: `${prefix}t3` })], { id: `${prefix}ts2` }),
        ],
        { orientation: "column" },
      ),
    ),
  );

  return (
    <section data-document={name} data-testid={name}>
      <DashfooLayout factory={factory} model={value} onModelChange={setValue} />
      <output data-testid={`${name}-model`} hidden>
        {JSON.stringify(value)}
      </output>
    </section>
  );
};

const renderOuter = (node: TabNode): ReactNode =>
  node.component === "nested" ? <Document name="nested" /> : renderContent(node);

const root = document.querySelector("#root");

if (!root) {
  throw new Error("missing fixture root");
}

createRoot(root).render(
  <DashfooDragProvider>
    <div data-documents>
      <Document factory={renderOuter} name="left" nested />
      <Document
        name="right"
        prefix={new URLSearchParams(location.search).has("distinct") ? "other-" : ""}
      />
    </div>
  </DashfooDragProvider>,
);

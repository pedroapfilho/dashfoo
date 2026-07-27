import type { ReactNode } from "react";

const SNIPPET = `<DashfooLayout
  defaultModel={model}
  factory={renderPanel}
  persist="my-app"
/>`;

const CodePanel = (): ReactNode => (
  <pre className="text-dashfoo-muted-foreground overflow-auto font-mono text-[0.6875rem]/4">
    {SNIPPET}
  </pre>
);

export { CodePanel };

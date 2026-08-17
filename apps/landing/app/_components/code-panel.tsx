import type { ReactNode } from "react";

const SNIPPET = `<DashfooLayout
  defaultModel={model}
  factory={renderPanel}
  persist="my-app"
/>`;

const CodePanel = (): ReactNode => (
  // Without a focus target, keyboard users cannot scroll overflow content.
  // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
  <section aria-label="Dashfoo layout example" className="overflow-auto" tabIndex={0}>
    <pre className="text-muted-foreground font-mono text-xs/4">{SNIPPET}</pre>
  </section>
);

export { CodePanel };

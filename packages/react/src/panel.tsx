"use client";

import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  // A leading icon slot — left to the consumer so the library pulls in no icon
  // dependency. Inherits currentColor through the theme.
  icon?: ReactNode;
  live?: boolean;
  title: ReactNode;
};

// Headless chrome for a tab's content: a titled header (optional leading icon +
// live badge) over a scrolling body. Emits only data-dashfoo attributes; the
// look is the theme's job, so consumers get the common panel shell for free
// without rebuilding it per app.
const Panel = ({ children, icon, live = false, title }: PanelProps): ReactNode => (
  <div data-dashfoo="panel">
    <div data-dashfoo="panel-header">
      <span data-dashfoo="panel-title">
        {icon ? <span data-dashfoo="panel-icon">{icon}</span> : null}
        {title}
      </span>
      {live ? <span data-dashfoo="panel-badge">Live</span> : null}
    </div>
    <div data-dashfoo="panel-body">{children}</div>
  </div>
);

export { Panel };
export type { PanelProps };

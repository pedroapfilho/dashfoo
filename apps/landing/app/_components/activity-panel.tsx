import type { ReactNode } from "react";

const ACTIVITY = [
  "Layout saved to localStorage",
  "Tab “Orders” docked right",
  "Splitter resized → 62 / 38",
  "Panel “Activity” maximized",
] as const;

const ActivityPanel = (): ReactNode => (
  <ul className="flex flex-col gap-2.5 text-[0.6875rem]">
    {ACTIVITY.map((line) => (
      <li className="flex items-center gap-2" key={line}>
        <span className="bg-dashfoo-accent size-1.5 shrink-0 rounded-full" />
        <span className="text-dashfoo-muted-foreground">{line}</span>
      </li>
    ))}
  </ul>
);

export { ActivityPanel };

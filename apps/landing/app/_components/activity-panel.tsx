import type { ReactNode } from "react";

const ACTIVITY = [
  "Layout saved to localStorage",
  "Tab “Orders” docked right",
  "Splitter resized → 62 / 38",
  "Panel “Activity” maximized",
] as const;

const ActivityPanel = (): ReactNode => (
  // Without a focus target, keyboard users cannot scroll overflow content.
  // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
  <section aria-label="Recent layout activity" tabIndex={0}>
    <ul className="flex flex-col gap-2.5 text-xs">
      {ACTIVITY.map((line) => (
        <li className="flex items-center gap-2" key={line}>
          <span className="bg-accent size-1.5 shrink-0 rounded-full" />
          <span className="text-muted-foreground">{line}</span>
        </li>
      ))}
    </ul>
  </section>
);

export { ActivityPanel };

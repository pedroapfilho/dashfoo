import { useTabset } from "@dashfoo/react";
import type { ReactNode } from "react";

/** The tablist's measured free space, so the docking demo shows it reacting to resizes and new tabs. */
const TablistSpaceBadge = (): ReactNode => {
  const space = useTabset((state) => state.tablistSpace);

  if (space === undefined) {
    return null;
  }

  return (
    <span
      className="text-foreground-muted dark:text-foreground-disabled px-1 text-xs whitespace-nowrap tabular-nums"
      data-testid="tablist-space"
      title="Free space in this tab list"
    >
      {`${Math.round(space)}px free`}
    </span>
  );
};

export { TablistSpaceBadge };

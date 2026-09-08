"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const ActivityContext = createContext<ReadonlyArray<string>>([]);

const ActivityPanel = (): ReactNode => {
  const activity = useContext(ActivityContext);
  return (
    <section aria-label="Recent layout activity">
      <ul aria-live="polite" className="flex flex-col gap-2.5 text-xs">
        {activity.length === 0 ? (
          <li>Try moving a tab or resizing a panel.</li>
        ) : (
          activity.map((line, index) => (
            <li className="text-muted-foreground" key={`${index}:${line}`}>
              {line}
            </li>
          ))
        )}
      </ul>
    </section>
  );
};

export { ActivityContext, ActivityPanel };

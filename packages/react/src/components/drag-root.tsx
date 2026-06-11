"use client";

import type { ReactNode } from "react";
import { useInsertionEffect, useState } from "react";

import { createDragManager, SharedDragManagerContext } from "../hooks/drag-hooks";

// Shares one DragDropManager between a DashfooLayout and external tab sources
// (useExternalTabSource) rendered outside it, so a drag can start at a widget
// list and end on the layout. Optional: a standalone DashfooLayout creates its
// own manager and behaves as before.
const DashfooDragProvider = ({ children }: { children: ReactNode }): ReactNode => {
  // useState lazily constructs the manager once; the destroy rides a
  // useInsertionEffect cleanup (not useEffect) so StrictMode's simulated unmount
  // doesn't tear down the live instance — the same pattern DragProvider uses.
  const [manager] = useState(createDragManager);
  useInsertionEffect(() => () => manager.destroy(), [manager]);

  return (
    <SharedDragManagerContext.Provider value={manager}>
      {children}
    </SharedDragManagerContext.Provider>
  );
};

export { DashfooDragProvider };

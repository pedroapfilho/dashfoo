"use client";

import type { ReactNode } from "react";
import { useInsertionEffect, useState } from "react";

import {
  createDragManager,
  createDragSubjectStore,
  DragSubjectStoreContext,
  SharedDragManagerContext,
} from "../hooks/drag-hooks";

import { DragPreviewOverlay } from "./drag-overlays";

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
  // Hosting the drag store here (the nested DragLayer adopts it instead of
  // creating its own) lets useDragSubject/useDropIntent observe the drag from
  // anywhere under the provider — widget lists, custom drop indicators — not
  // just from inside the layout.
  const [subjectStore] = useState(createDragSubjectStore);

  return (
    <SharedDragManagerContext.Provider value={manager}>
      <DragSubjectStoreContext.Provider value={subjectStore}>
        {children}
        {/* The manager owner renders the one chip — nested DragProviders
            sharing this manager render none, so cross-layout drags show a
            single preview instead of one per layer. */}
        <DragPreviewOverlay manager={manager} />
      </DragSubjectStoreContext.Provider>
    </SharedDragManagerContext.Provider>
  );
};

export { DashfooDragProvider };

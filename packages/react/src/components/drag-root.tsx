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

const DashfooDragProvider = ({ children }: { children: ReactNode }): ReactNode => {
  const [manager] = useState(createDragManager);
  useInsertionEffect(
    () => () => {
      manager.destroy();
    },
    [manager],
  );

  const [subjectStore] = useState(createDragSubjectStore);

  return (
    <SharedDragManagerContext.Provider value={manager}>
      <DragSubjectStoreContext.Provider value={subjectStore}>
        {children}
        <DragPreviewOverlay manager={manager} />
      </DragSubjectStoreContext.Provider>
    </SharedDragManagerContext.Provider>
  );
};

export { DashfooDragProvider };

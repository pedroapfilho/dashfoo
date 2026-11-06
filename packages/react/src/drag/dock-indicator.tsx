"use client";

import type { Rect } from "@dashfoo/core";
import { useSelector } from "@xstate/react";
import type { ReactNode } from "react";

import type { DragActor } from "./drag-context";

const DockZone = ({ insertion, rect }: { insertion: boolean; rect: Rect }): ReactNode => (
  <div
    data-dashfoo="dock-indicator"
    data-insertion={insertion || undefined}
    style={{
      "--dashfoo-dock-height": `${rect.height}px`,
      "--dashfoo-dock-left": `${rect.x}px`,
      "--dashfoo-dock-top": `${rect.y}px`,
      "--dashfoo-dock-width": `${rect.width}px`,
    }}
  />
);

/** Rendered by each layer, inside its own DOM, for the drops that layer resolved. */
const DockIndicator = ({
  actorRef,
  layerId,
}: {
  actorRef: DragActor;
  layerId: string;
}): ReactNode => {
  const indicator = useSelector(actorRef, (snapshot) => {
    const { drag } = snapshot.context;

    return drag.kind === "dragging" && drag.drop?.scope === layerId ? drag.drop.indicator : null;
  });

  return indicator === null ? null : (
    <DockZone insertion={indicator.kind === "insertion"} rect={indicator.rect} />
  );
};

export { DockIndicator };

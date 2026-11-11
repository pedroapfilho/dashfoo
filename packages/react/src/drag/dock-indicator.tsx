"use client";

import type { DropIndicator } from "@dashfoo/core";
import { useSelector } from "@xstate/react";
import type { ReactNode } from "react";
import { useState } from "react";

import type { DragActor } from "./drag-context";

type Shown = { floating: boolean; indicator: DropIndicator };

/**
 * One element for the whole drag, so a CSS transition can slide it between
 * tabsets. Off any target it stays where it last was, marked `data-idle`, so
 * it can fade instead of vanishing.
 */
const DockIndicator = ({
  actorRef,
  isFloating,
}: {
  actorRef: DragActor;
  isFloating: (scope: string) => boolean;
}): ReactNode => {
  const dragging = useSelector(actorRef, (snapshot) => snapshot.context.drag.kind === "dragging");

  const drop = useSelector(actorRef, (snapshot) => {
    const { drag } = snapshot.context;

    return drag.kind === "dragging" ? drag.drop : null;
  });

  const [shown, setShown] = useState<Shown | null>(null);

  if (drop !== null && drop.indicator !== shown?.indicator) {
    setShown({ floating: isFloating(drop.scope), indicator: drop.indicator });
  }

  if (!dragging && shown !== null) {
    setShown(null);
  }

  if (shown === null) {
    return null;
  }

  const { rect } = shown.indicator;

  return (
    <div
      data-dashfoo="dock-indicator"
      data-floating={shown.floating || undefined}
      data-idle={drop === null || undefined}
      data-insertion={shown.indicator.kind === "insertion" || undefined}
      style={{
        "--dashfoo-dock-height": `${rect.height}px`,
        "--dashfoo-dock-left": `${rect.x}px`,
        "--dashfoo-dock-top": `${rect.y}px`,
        "--dashfoo-dock-width": `${rect.width}px`,
      }}
    />
  );
};

export { DockIndicator };

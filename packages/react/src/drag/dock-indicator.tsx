"use client";

import type { Rect } from "@dashfoo/core";
import { dropIndicator } from "@dashfoo/core";
import { useSelector } from "@xstate/react";
import type { ReactNode } from "react";

import type { DragContextValue } from "./drag-context";
import { tabsetDroppableId } from "./drag-hooks";
import { measureTabset } from "./measure-tabset";

const FLOAT_Z_INDEX = 9999;

const DockZone = ({
  insertion,
  rect,
  zIndex,
}: {
  insertion: boolean;
  rect: Rect;
  zIndex: number | "auto";
}): ReactNode => (
  <div
    data-dashfoo="dock-indicator"
    data-insertion={insertion || undefined}
    style={{
      "--dashfoo-dock-height": `${rect.height}px`,
      "--dashfoo-dock-left": `${rect.x}px`,
      "--dashfoo-dock-top": `${rect.y}px`,
      "--dashfoo-dock-width": `${rect.width}px`,
      "--dashfoo-dock-z": zIndex,
    }}
  />
);

/** Rendered by each layer, inside its own DOM, for the drops that layer resolved. */
const DockIndicator = ({
  context: { actorRef, manager },
  layerId,
}: {
  context: DragContextValue;
  layerId: string;
}): ReactNode => {
  const drag = useSelector(actorRef, (snapshot) => snapshot.context.drag);
  if (drag.kind !== "dragging" || drag.drop === null || drag.drop.scope !== layerId) {
    return null;
  }
  const { intent } = drag.drop;
  const element = manager.registry.droppables.get(
    tabsetDroppableId(layerId, intent.targetId),
  )?.element;
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const { kind, rect } = dropIndicator(
    drag.subject,
    measureTabset(intent.targetId, element),
    intent,
  );
  const zIndex = element.closest('[data-dashfoo="float"]') ? FLOAT_Z_INDEX : "auto";
  return <DockZone insertion={kind === "insertion"} rect={rect} zIndex={zIndex} />;
};

export { DockIndicator };

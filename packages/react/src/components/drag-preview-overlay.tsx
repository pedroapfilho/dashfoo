"use client";

import type { Point } from "@dashfoo/core";
import { zoneRect } from "@dashfoo/core";
import { Feedback } from "@dnd-kit/dom";
import type { DragStartEvent } from "@dnd-kit/dom";
import { useSelector } from "@xstate/react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import type { DashfooDragManager, DragActor } from "../hooks/drag-hooks";
import type { DragSource } from "../lib/drag-subject";
import type { Zone } from "../lib/tab-insertion";
import { insertionLineRect } from "../lib/tab-insertion";

const overlayBase: CSSProperties = {
  boxSizing: "border-box",
  pointerEvents: "none",
  position: "fixed",

  transition: "var(--dashfoo-dock-transition, left 60ms, top 60ms, width 60ms, height 60ms)",
  zIndex: 9999,
};

const paneStyle = (zone: Zone): CSSProperties => ({
  ...overlayBase,
  background: "var(--dashfoo-dock-fill, oklch(0.556 0 0 / 0.18))",
  border:
    "var(--dashfoo-dock-border-width, 1px) solid var(--dashfoo-dock-border, oklch(0.708 0 0 / 0.75))",
  borderRadius: "var(--dashfoo-dock-radius, 6px)",
  height: zone.height,
  left: zone.x,
  top: zone.y,
  width: zone.width,
});

const lineStyle = (zone: Zone): CSSProperties => ({
  ...paneStyle(zone),
  borderRadius: "var(--dashfoo-dock-line-radius, 2px)",
});

const tabItemRects = (strip: Element, excludeId?: string): Array<DOMRect> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab-item"]')].flatMap((item) =>
    item.querySelector<HTMLElement>('[data-dashfoo="tab"]')?.dataset.tabId === excludeId
      ? []
      : [item.getBoundingClientRect()],
  );

const DockIndicator = ({
  actorRef,
  getTabsetElement,
}: {
  actorRef: DragActor;
  getTabsetElement: (id: string) => HTMLElement | undefined;
}): ReactNode => {
  const drag = useSelector(actorRef, (snapshot) => snapshot.context.drag);
  if (drag.kind !== "dragging" || drag.drop === null) {
    return null;
  }
  const { intent } = drag.drop;
  const draggedId = drag.subject.id;
  const element = getTabsetElement(intent.targetId);
  if (!element) {
    return null;
  }

  const zIndex = element.closest('[data-dashfoo="float"]') ? overlayBase.zIndex : "auto";
  if (intent.location === "center") {
    const strip = element.querySelector('[data-dashfoo="tabstrip"]');
    if (strip) {
      const line = insertionLineRect(
        strip.getBoundingClientRect(),
        tabItemRects(strip, draggedId),
        intent.index ?? 0,
      );
      return <div data-dashfoo="dock-indicator" style={{ ...lineStyle(line), zIndex }} />;
    }
  }
  const zone = zoneRect(element.getBoundingClientRect(), intent.location);
  return <div data-dashfoo="dock-indicator" style={{ ...paneStyle(zone), zIndex }} />;
};

const PREVIEW_OFFSET: Point = { x: 12, y: 8 };

const labelOf = (source: DragSource | null): string => {
  if (typeof source?.data.label !== "string") {
    return "";
  }
  return source.data.label;
};

type ChipState = { label: string; x: number; y: number };

const DragPreviewOverlay = ({ manager }: { manager: DashfooDragManager }): ReactNode => {
  const [chip, setChip] = useState<ChipState | null>(null);

  useEffect(() => {
    const handleStart = (event: DragStartEvent): void => {
      const source = event.operation.source;
      if (!source) {
        return;
      }
      const rect = source.element?.getBoundingClientRect();
      const point = event.operation.position.current;
      setChip({
        label: labelOf(source),
        x: PREVIEW_OFFSET.x + (rect ? point.x - rect.left : 0),
        y: PREVIEW_OFFSET.y + (rect ? point.y - rect.top : 0),
      });
    };
    const handleEnd = (): void => {
      setChip(null);
    };
    manager.monitor.addEventListener("dragstart", handleStart);
    manager.monitor.addEventListener("dragend", handleEnd);
    return () => {
      manager.monitor.removeEventListener("dragstart", handleStart);
      manager.monitor.removeEventListener("dragend", handleEnd);
    };
  }, [manager]);

  const attachOverlay = useCallback(
    (element: HTMLDivElement | null): void => {
      const feedback = manager.registry.plugins.get(Feedback);
      if (feedback) {
        feedback.overlay = element ?? undefined;
      }
    },
    [manager],
  );

  return (
    <div data-dnd-overlay="" ref={attachOverlay}>
      {chip === null ? null : (
        <div
          data-dashfoo="drag-preview"
          style={{
            left: 0,
            position: "absolute",
            top: 0,
            transform: `translate(${chip.x}px, ${chip.y}px)`,

            width: "max-content",
          }}
        >
          {chip.label}
        </div>
      )}
    </div>
  );
};

export { DockIndicator, DragPreviewOverlay };

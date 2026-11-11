"use client";

import type { Point } from "@dashfoo/core";
import { Feedback } from "@dnd-kit/dom";
import type { DragStartEvent } from "@dnd-kit/dom";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import type { DashfooDragManager } from "./drag-manager";
import type { DragSource } from "./drag-subject";

const PREVIEW_OFFSET: Point = { x: 12, y: 8 };

const labelOf = (source: DragSource | null): string => {
  if (typeof source?.data.label !== "string") {
    return "";
  }

  return source.data.label;
};

type ChipState = { label: string; x: number; y: number };

type DragPreviewOverlayProps = {
  isTearOff: (point: Point) => boolean;
  manager: DashfooDragManager;
};

const DragPreviewOverlay = ({ isTearOff, manager }: DragPreviewOverlayProps): ReactNode => {
  const [chip, setChip] = useState<ChipState | null>(null);
  const [tearOff, setTearOff] = useState(false);

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

    const handleMove = (): void => {
      setTearOff(isTearOff(manager.dragOperation.position.current));
    };

    const handleEnd = (): void => {
      setChip(null);
      setTearOff(false);
    };

    manager.monitor.addEventListener("dragstart", handleStart);
    manager.monitor.addEventListener("dragmove", handleMove);
    manager.monitor.addEventListener("dragend", handleEnd);

    return () => {
      manager.monitor.removeEventListener("dragstart", handleStart);
      manager.monitor.removeEventListener("dragmove", handleMove);
      manager.monitor.removeEventListener("dragend", handleEnd);
    };
  }, [isTearOff, manager]);

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
          data-tear-off={tearOff || undefined}
          style={{
            "--dashfoo-preview-x": `${chip.x}px`,
            "--dashfoo-preview-y": `${chip.y}px`,
          }}
        >
          {chip.label}
        </div>
      )}
    </div>
  );
};

export { DragPreviewOverlay };

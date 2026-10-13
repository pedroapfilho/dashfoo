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

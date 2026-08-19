import type { DragSubject, DropIntent, Point, Rect } from "@dashfoo/core";
import { useDragSubject, useDropIntent } from "@dashfoo/react";
import type { ReactNode, RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { ActiveCell, TabsetMeasurement, ZoneCell } from "../lib/drop-zone-map";
import { activeCellAt, buildZoneMap, cellKey } from "../lib/drop-zone-map";

const DOCK_LABELS = {
  center: "stack",
  "split-bottom": "split ↓",
  "split-left": "split ←",
  "split-right": "split →",
  "split-top": "split ↑",
};

const toRect = (rect: DOMRect): Rect => ({
  height: rect.height,
  width: rect.width,
  x: rect.x,
  y: rect.y,
});

const measureTabsets = (container: HTMLElement, draggedTabId?: string): Array<TabsetMeasurement> =>
  [...container.querySelectorAll<HTMLElement>('[data-dashfoo="tabset"]')].map((tabset) => {
    const strip = tabset.querySelector<HTMLElement>('[data-dashfoo="tabstrip"]');
    const tabMidpoints = strip
      ? [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].flatMap((tab) => {
          if (tab.dataset.tabId === draggedTabId) {
            return [];
          }
          const rect = tab.getBoundingClientRect();
          return [rect.x + rect.width / 2];
        })
      : [];
    return {
      rect: toRect(tabset.getBoundingClientRect()),
      strip: strip ? toRect(strip.getBoundingClientRect()) : null,
      tabMidpoints,
    };
  });

const centroid = (points: ReadonlyArray<Point>): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

const svgPoints = (points: ReadonlyArray<Point>): string =>
  points.map((p) => `${p.x},${p.y}`).join(" ");

const hueOf = (tabsetIndex: number): number => (210 + tabsetIndex * 67) % 360;

const cellFill = (cell: ZoneCell, highlighted: boolean, noop: boolean): string => {
  if (noop) {
    return `hsl(0 0% 50% / ${highlighted ? 0.3 : 0.08})`;
  }
  if (highlighted) {
    return `hsl(${hueOf(cell.tabsetIndex)} 70% 55% / 0.38)`;
  }
  return `hsl(${hueOf(cell.tabsetIndex)} 70% 55% / ${cell.kind === "slot" ? 0.16 : 0.09})`;
};

const chipText = (intent: DropIntent | null, activeCell: ActiveCell | null): string | null => {
  if (intent === null) {
    return activeCell === null ? null : "no-op";
  }
  if (intent.location !== "center") {
    return `${DOCK_LABELS[intent.location]} → ${intent.targetId}`;
  }
  const slot = intent.index === undefined ? "" : ` @ ${intent.index}`;
  return `stack${slot} → ${intent.targetId}`;
};

const ZonePolygon = ({
  cell,
  highlighted,
  noop,
}: {
  cell: ZoneCell;
  highlighted: boolean;
  noop: boolean;
}): ReactNode => {
  const hue = hueOf(cell.tabsetIndex);
  const center = centroid(cell.points);
  const label = cell.kind === "dock" ? DOCK_LABELS[cell.location] : String(cell.slotIndex);
  return (
    <g>
      <polygon
        fill={cellFill(cell, highlighted, noop)}
        points={svgPoints(cell.points)}
        stroke={noop ? "hsl(0 0% 50% / 0.6)" : `hsl(${hue} 70% 50% / 0.55)`}
        strokeDasharray={highlighted ? "5 3" : undefined}
        strokeWidth={highlighted ? 1.5 : 0.75}
      />
      <text
        fill={noop ? "hsl(0 0% 50%)" : `hsl(${hue} 60% 45%)`}
        fontSize={10}
        style={{ paintOrder: "stroke" }}
        textAnchor="middle"
        x={center.x}
        y={center.y + 3}
      >
        {noop && highlighted ? "no-op" : label}
      </text>
    </g>
  );
};

type Measured = { list: Array<TabsetMeasurement>; subject: DragSubject };

const DropZoneOverlay = ({
  containerRef,
  enabled,
}: {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}): ReactNode => {
  const subject = useDragSubject();
  const intent = useDropIntent();
  const [pointer, setPointer] = useState<Point | null>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const dragging = enabled && subject !== null;

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }
    let frame = 0;
    let latest: Point | null = null;
    const handlePointerMove = (event: PointerEvent): void => {
      latest = { x: event.clientX, y: event.clientY };
      if (frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          setPointer(latest);
        });
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { capture: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, { capture: true });
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
    };
  }, [dragging]);

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const draggedTabId = subject.kind === "tab" ? subject.id : undefined;
    const measure = (): void => {
      setMeasured({ list: measureTabsets(container, draggedTabId), subject });
    };
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, dragging, subject]);

  const tabsets = measured !== null && measured.subject === subject ? measured.list : null;
  const cells = useMemo(() => (tabsets ? buildZoneMap(tabsets) : []), [tabsets]);

  if (!dragging || !tabsets || typeof document === "undefined") {
    return null;
  }

  const activeCell = pointer ? activeCellAt(tabsets, pointer) : null;
  const activeKey = activeCell ? cellKey(activeCell) : null;
  const activePolygon =
    activeKey === null ? null : (cells.find((cell) => cellKey(cell) === activeKey)?.points ?? null);

  const noop = intent === null && activeCell !== null;
  const chip = chipText(intent, activeCell);
  const lineColor = noop ? "hsl(0 0% 50% / 0.6)" : "hsl(210 80% 55% / 0.6)";

  return createPortal(
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-9998 h-full w-full"
      data-testid="drop-zone-overlay"
    >
      {cells.map((cell) => (
        <ZonePolygon
          cell={cell}
          highlighted={cellKey(cell) === activeKey}
          key={cellKey(cell)}
          noop={noop && cellKey(cell) === activeKey}
        />
      ))}
      {pointer && activePolygon ? (
        <g>
          {activePolygon.map((vertex, index) => (
            <line
              key={index}
              stroke={lineColor}
              strokeDasharray="4 4"
              x1={pointer.x}
              x2={vertex.x}
              y1={pointer.y}
              y2={vertex.y}
            />
          ))}
          {activePolygon.map((vertex, index) => (
            <circle cx={vertex.x} cy={vertex.y} fill="hsl(210 80% 55%)" key={index} r={2.5} />
          ))}
          <circle cx={pointer.x} cy={pointer.y} fill="hsl(210 80% 55%)" r={3.5} />
        </g>
      ) : null}
      {pointer && chip !== null && chip !== "" ? (
        <text
          className="fill-neutral-800 dark:fill-neutral-100"
          fontSize={11}
          style={{ paintOrder: "stroke" }}
          x={pointer.x + 16}
          y={pointer.y - 12}
        >
          {chip}
        </text>
      ) : null}
    </svg>,
    document.body,
  );
};

export { DropZoneOverlay };

import type { DragSubject, DropIntent, MeasuredTabset, Point } from "@dashfoo/core";
import { measureTabset, useDragSubject, useDropIntent } from "@dashfoo/react";
import type { ReactNode, RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { ZoneCell } from "../lib/drop-zone-map";
import { buildZoneMap, cellKey, intentKey } from "../lib/drop-zone-map";

const DOCK_LABELS = {
  center: "stack",
  "split-bottom": "split ↓",
  "split-left": "split ←",
  "split-right": "split →",
  "split-top": "split ↑",
};

const measureTabsets = (container: HTMLElement): Array<MeasuredTabset> =>
  [...container.querySelectorAll<HTMLElement>('[data-dashfoo="tabset"]')].flatMap((element) => {
    const id = element.dataset.tabsetId;

    return id === undefined ? [] : [measureTabset(id, element)];
  });

/** The library resolves drops against the topmost element, so these checks do too. */
const isUnder = (pointer: Point, selector: string): boolean =>
  (document.elementFromPoint(pointer.x, pointer.y)?.closest(selector) ?? null) !== null;

const centroid = (points: ReadonlyArray<Point>): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

const svgPoints = (points: ReadonlyArray<Point>): string =>
  points.map((p) => `${p.x},${p.y}`).join(" ");

const hueOf = (tabsetIndex: number): number => (210 + tabsetIndex * 67) % 360;

const cellFill = (cell: ZoneCell, hue: number, highlighted: boolean): string =>
  highlighted
    ? `hsl(${hue} 70% 55% / 0.38)`
    : `hsl(${hue} 70% 55% / ${cell.kind === "slot" ? 0.16 : 0.09})`;

const chipText = (intent: DropIntent | null, noop: boolean): string | null => {
  if (intent === null) {
    return noop ? "no-op" : null;
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
  hue,
}: {
  cell: ZoneCell;
  highlighted: boolean;
  hue: number;
}): ReactNode => {
  const center = centroid(cell.points);
  const label = cell.kind === "dock" ? DOCK_LABELS[cell.location] : String(cell.slotIndex);

  return (
    <g>
      <polygon
        fill={cellFill(cell, hue, highlighted)}
        points={svgPoints(cell.points)}
        stroke={`hsl(${hue} 70% 50% / 0.55)`}
        strokeDasharray={highlighted ? "5 3" : undefined}
        strokeWidth={highlighted ? 1.5 : 0.75}
      />
      <text
        fill={`hsl(${hue} 60% 45%)`}
        fontSize={10}
        paintOrder="stroke"
        textAnchor="middle"
        x={center.x}
        y={center.y + 3}
      >
        {label}
      </text>
    </g>
  );
};

type Measured = { list: Array<MeasuredTabset>; subject: DragSubject };

const useDragPointer = (dragging: boolean): Point | null => {
  const [pointer, setPointer] = useState<Point | null>(null);

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

  return pointer;
};

const useMeasuredTabsets = (
  containerRef: RefObject<HTMLElement | null>,
  subject: DragSubject | null,
): Array<MeasuredTabset> | null => {
  const [measured, setMeasured] = useState<Measured | null>(null);

  useEffect(() => {
    if (subject === null) {
      return undefined;
    }

    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const measure = (): void => {
      setMeasured({ list: measureTabsets(container), subject });
    };

    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, subject]);

  return measured?.subject === subject ? measured.list : null;
};

const DropZoneDrawing = ({
  cells,
  hues,
  intent,
  pointer,
}: {
  cells: Array<ZoneCell>;
  hues: Map<string, number>;
  intent: DropIntent | null;
  pointer: Point | null;
}): ReactNode => {
  const overStrip = pointer !== null && isUnder(pointer, '[data-dashfoo="tabstrip"]');
  const activeKey = intent === null ? null : intentKey(intent, overStrip);

  const activePolygon =
    activeKey === null ? null : (cells.find((cell) => cellKey(cell) === activeKey)?.points ?? null);

  const noop = intent === null && pointer !== null && isUnder(pointer, '[data-dashfoo="tabset"]');
  const chip = chipText(intent, noop);
  const lineColor = "hsl(210 80% 55% / 0.6)";

  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-9998 size-full"
      data-testid="drop-zone-overlay"
    >
      {cells.map((cell) => (
        <ZonePolygon
          cell={cell}
          highlighted={cellKey(cell) === activeKey}
          hue={hues.get(cell.tabsetId) ?? hueOf(0)}
          key={cellKey(cell)}
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
            <circle cx={vertex.x} cy={vertex.y} fill="var(--color-drop-zone)" key={index} r={2.5} />
          ))}
          <circle cx={pointer.x} cy={pointer.y} fill="var(--color-drop-zone)" r={3.5} />
        </g>
      ) : null}
      {pointer && chip !== null && chip !== "" ? (
        <text
          className="fill-illustration-ink dark:fill-illustration-inverse"
          fontSize={11}
          paintOrder="stroke"
          x={pointer.x + 16}
          y={pointer.y - 12}
        >
          {chip}
        </text>
      ) : null}
    </svg>
  );
};

const DropZoneOverlay = ({
  containerRef,
  enabled,
}: {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}): ReactNode => {
  const subject = useDragSubject();
  const intent = useDropIntent();
  const dragging = enabled && subject !== null;
  const pointer = useDragPointer(dragging);
  const tabsets = useMeasuredTabsets(containerRef, enabled ? subject : null);

  const cells = useMemo(
    () => (tabsets && subject ? buildZoneMap(subject, tabsets) : []),
    [subject, tabsets],
  );

  const hues = useMemo(
    () => new Map((tabsets ?? []).map((tabset, index) => [tabset.id, hueOf(index)])),
    [tabsets],
  );

  if (!dragging || !tabsets || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <DropZoneDrawing cells={cells} hues={hues} intent={intent} pointer={pointer} />,
    document.body,
  );
};

export { DropZoneOverlay };

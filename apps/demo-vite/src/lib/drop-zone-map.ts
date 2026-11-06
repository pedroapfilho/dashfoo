import type {
  DockLocation,
  DragSubject,
  DropIntent,
  MeasuredTabset,
  Point,
  Rect,
} from "@dashfoo/core";
import { dockZonePolygons } from "@dashfoo/core";

type ZoneCell =
  | { kind: "dock"; location: DockLocation; points: Array<Point>; tabsetId: string }
  | { kind: "slot"; points: Array<Point>; slotIndex: number; tabsetId: string };

const rectPolygon = (rect: Rect): Array<Point> => [
  { x: rect.x, y: rect.y },
  { x: rect.x + rect.width, y: rect.y },
  { x: rect.x + rect.width, y: rect.y + rect.height },
  { x: rect.x, y: rect.y + rect.height },
];

/** The dragged tab leaves its strip before it lands, so its own slot is not a target. */
const slotCells = (subject: DragSubject, tabset: MeasuredTabset): Array<ZoneCell> => {
  const { strip } = tabset;

  if (!strip) {
    return [];
  }

  const midpoints = strip.tabs.flatMap((tab) =>
    subject.kind === "tab" && tab.id === subject.id ? [] : [tab.rect.x + tab.rect.width / 2],
  );

  const bounds = [strip.rect.x, ...midpoints, strip.rect.x + strip.rect.width];

  return bounds.slice(0, -1).map((left, slotIndex) => {
    const right = bounds[slotIndex + 1] ?? strip.rect.x + strip.rect.width;

    return {
      kind: "slot",
      points: rectPolygon({
        height: strip.rect.height,
        width: right - left,
        x: left,
        y: strip.rect.y,
      }),
      slotIndex,
      tabsetId: tabset.id,
    };
  });
};

const buildZoneMap = (subject: DragSubject, tabsets: Array<MeasuredTabset>): Array<ZoneCell> =>
  tabsets.flatMap((tabset) => [
    ...dockZonePolygons(tabset.rect).map<ZoneCell>(({ location, points }) => ({
      kind: "dock",
      location,
      points,
      tabsetId: tabset.id,
    })),
    ...slotCells(subject, tabset),
  ]);

const cellKey = (cell: ZoneCell): string =>
  cell.kind === "dock"
    ? `${cell.tabsetId}:dock:${cell.location}`
    : `${cell.tabsetId}:slot:${cell.slotIndex}`;

/**
 * The cell the library's own drop intent lands in. A stack drop always carries
 * an index when the target has a strip, so the pointer decides between the
 * strip slot and the body's center zone.
 */
const intentKey = (intent: DropIntent, overStrip: boolean): string =>
  intent.location === "center" && intent.index !== undefined && overStrip
    ? `${intent.targetId}:slot:${intent.index}`
    : `${intent.targetId}:dock:${intent.location}`;

export { buildZoneMap, cellKey, intentKey };

export type { ZoneCell };

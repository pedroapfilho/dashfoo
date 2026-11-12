import type { DockLocation, SplitLocation } from "../model/dock-location";
import { SPLIT_PLACEMENT } from "../model/dock-location";
import type { TabNode } from "../model/schema";

import type { Point, Rect } from "./geometry";
import { resolveDockTarget, zoneRect } from "./geometry";

type DragSubject =
  | { documentId: string; id: string; kind: "tab" | "tabset" }
  | { id: string; kind: "external"; tab: TabNode };

type DropIntent = { index?: number; location: DockLocation; targetId: string };

type MeasuredTab = { id: string; rect: Rect };

/** `tabs` in strip order, each rect spanning the whole tab item (label plus close button). */
type MeasuredStrip = { rect: Rect; tabs: ReadonlyArray<MeasuredTab> };

type Direction = "ltr" | "rtl";

/**
 * A tabset without a strip has no tab order to measure, so a stack drop onto it
 * carries no index. `direction` defaults to `"ltr"`.
 */
type MeasuredTabset = {
  direction?: Direction;
  id: string;
  rect: Rect;
  strip: MeasuredStrip | null;
};

/** The main layout's root row, whose id an edge drop targets. */
type MeasuredLayout = { id: string; rect: Rect; tabsetCount: number };

/**
 * `edges` turns on drops at the layout's edges; leave it out to turn them off.
 * `foreign`: the subject comes from another document, so matching ids are not the same node.
 */
type DropIntentOptions = { edges?: MeasuredLayout; foreign?: boolean; splitDock?: boolean };

type DropIndicator = { kind: "edge" | "insertion" | "zone"; rect: Rect };

const INSERTION_LINE_WIDTH = 4;

/** How close to the layout's edge, in pixels, a drop docks beside the whole layout. */
const EDGE_BAND = 12;

/** Matches the share the reducer gives an edge drop, so the indicator previews the landed size. */
const EDGE_ZONE_SHARE = 0.25;

const EDGE_LOCATIONS: ReadonlyArray<SplitLocation> = [
  "split-left",
  "split-right",
  "split-top",
  "split-bottom",
];

/**
 * Locations name the model's row order, `split-left` meaning first. A
 * right-to-left row paints its first child on the right, so the screen side
 * and the model side swap.
 */
const mirrorSplit = (location: SplitLocation, direction: Direction | undefined): SplitLocation => {
  if (direction !== "rtl") {
    return location;
  }

  if (location === "split-left") {
    return "split-right";
  }

  return location === "split-right" ? "split-left" : location;
};

const screenSide = (location: DockLocation, direction: Direction | undefined): DockLocation =>
  location === "center" ? location : mirrorSplit(location, direction);

const pointInRect = (point: Point, rect: Rect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

/** The dragged tab leaves its slot before it lands, so indexes count only the tabs it lands among. */
const landingTabs = (subject: DragSubject, strip: MeasuredStrip): ReadonlyArray<MeasuredTab> =>
  subject.kind === "tab" ? strip.tabs.filter((tab) => tab.id !== subject.id) : strip.tabs;

const insertionIndex = (
  tabs: ReadonlyArray<MeasuredTab>,
  pointerX: number,
  direction: Direction | undefined,
): number => {
  const found = tabs.findIndex((tab) => {
    const middle = tab.rect.x + tab.rect.width / 2;

    return direction === "rtl" ? pointerX > middle : pointerX < middle;
  });

  return found === -1 ? tabs.length : found;
};

/** Drops that change nothing once empty tabsets collapse. */
const isSelfDrop = (subject: DragSubject, tabset: MeasuredTabset): boolean => {
  if (subject.kind === "tabset") {
    return subject.id === tabset.id;
  }

  const tabs = tabset.strip?.tabs ?? [];

  return subject.kind === "tab" && tabs.length === 1 && tabs[0]?.id === subject.id;
};

/** How far inside `rect` the pointer is from one of its screen edges. */
const edgeDistance = (point: Point, rect: Rect, edge: SplitLocation): number => {
  const { before, orientation } = SPLIT_PLACEMENT[edge];
  const row = orientation === "row";
  const start = row ? rect.x : rect.y;
  const at = row ? point.x : point.y;

  return before ? at - start : start + (row ? rect.width : rect.height) - at;
};

type NearestEdge = { distance: number; edge: SplitLocation | null };

/** The nearest screen edge of the layout the pointer is within `EDGE_BAND` of. */
const nearEdge = (point: Point, rect: Rect): SplitLocation | null => {
  if (!pointInRect(point, rect)) {
    return null;
  }

  return EDGE_LOCATIONS.reduce<NearestEdge>(
    (nearest, edge) => {
      const distance = edgeDistance(point, rect, edge);

      return distance < nearest.distance ? { distance, edge } : nearest;
    },
    { distance: EDGE_BAND + 1, edge: null },
  ).edge;
};

/** With one tabset, the edge is that tabset's own edge, so docking it there changes nothing. */
const resolveEdgeIntent = (
  selfDrop: boolean,
  tabset: MeasuredTabset,
  point: Point,
  layout: MeasuredLayout,
): DropIntent | null => {
  const edge = nearEdge(point, layout.rect);

  if (edge === null || (layout.tabsetCount <= 1 && selfDrop)) {
    return null;
  }

  return { location: mirrorSplit(edge, tabset.direction), targetId: layout.id };
};

const resolveDropIntent = (
  subject: DragSubject,
  tabset: MeasuredTabset,
  point: Point,
  options?: DropIntentOptions,
): DropIntent | null => {
  const splitDock = options?.splitDock !== false;
  const selfDrop = options?.foreign !== true && isSelfDrop(subject, tabset);

  const edgeIntent =
    splitDock && options?.edges ? resolveEdgeIntent(selfDrop, tabset, point, options.edges) : null;

  if (edgeIntent) {
    return edgeIntent;
  }

  if (selfDrop) {
    return null;
  }

  const { direction, strip } = tabset;

  if (strip && pointInRect(point, strip.rect)) {
    return {
      index: insertionIndex(landingTabs(subject, strip), point.x, direction),
      location: "center",
      targetId: tabset.id,
    };
  }

  const location = splitDock
    ? screenSide(resolveDockTarget(point, tabset.rect), direction)
    : "center";

  if (location === "center" && strip) {
    return { index: landingTabs(subject, strip).length, location, targetId: tabset.id };
  }

  return { location, targetId: tabset.id };
};

/** Where slot `index` starts on screen: the leading edge of the tab now there, else past the last. */
const leadingEdge = (rect: Rect, direction: Direction | undefined): number =>
  direction === "rtl" ? rect.x + rect.width : rect.x;

const trailingEdge = (rect: Rect, direction: Direction | undefined): number =>
  direction === "rtl" ? rect.x : rect.x + rect.width;

const slotEdge = (
  strip: MeasuredStrip,
  tabs: ReadonlyArray<MeasuredTab>,
  index: number,
  direction: Direction | undefined,
): number => {
  const at = tabs.at(index);
  const last = tabs.at(-1);

  if (at) {
    return leadingEdge(at.rect, direction);
  }

  return last ? trailingEdge(last.rect, direction) : leadingEdge(strip.rect, direction);
};

const insertionLineRect = (
  strip: MeasuredStrip,
  tabs: ReadonlyArray<MeasuredTab>,
  index: number,
  direction: Direction | undefined,
): Rect => {
  const x = slotEdge(strip, tabs, index, direction);
  const left = x - INSERTION_LINE_WIDTH / 2;
  const { rect } = strip;

  return {
    height: rect.height,
    width: INSERTION_LINE_WIDTH,
    x: Math.max(rect.x, Math.min(left, rect.x + rect.width - INSERTION_LINE_WIDTH)),
    y: rect.y,
  };
};

const edgeZoneRect = (rect: Rect, edge: SplitLocation): Rect => {
  const { before, orientation } = SPLIT_PLACEMENT[edge];

  if (orientation === "row") {
    const width = rect.width * EDGE_ZONE_SHARE;

    return {
      height: rect.height,
      width,
      x: before ? rect.x : rect.x + rect.width - width,
      y: rect.y,
    };
  }

  const height = rect.height * EDGE_ZONE_SHARE;

  return {
    height,
    width: rect.width,
    x: rect.x,
    y: before ? rect.y : rect.y + rect.height - height,
  };
};

/** Reads the same measurement `resolveDropIntent` did, so the line marks the slot the index names. */
const dropIndicator = (
  subject: DragSubject,
  tabset: MeasuredTabset,
  intent: DropIntent,
  options?: DropIntentOptions,
): DropIndicator => {
  const { direction, strip } = tabset;
  const edges = options?.edges;

  if (edges && intent.targetId === edges.id && intent.location !== "center") {
    return {
      kind: "edge",
      rect: edgeZoneRect(edges.rect, mirrorSplit(intent.location, direction)),
    };
  }

  if (intent.location === "center" && strip) {
    return {
      kind: "insertion",
      rect: insertionLineRect(strip, landingTabs(subject, strip), intent.index ?? 0, direction),
    };
  }

  return { kind: "zone", rect: zoneRect(tabset.rect, screenSide(intent.location, direction)) };
};

export { dropIndicator, resolveDropIntent };

export type {
  Direction,
  DragSubject,
  DropIndicator,
  DropIntent,
  DropIntentOptions,
  MeasuredLayout,
  MeasuredStrip,
  MeasuredTab,
  MeasuredTabset,
};

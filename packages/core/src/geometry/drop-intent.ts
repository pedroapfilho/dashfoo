import type { DragSubject } from "../machines/drag-dock-machine";
import type { DropIntent } from "../state/actions";

import type { Point, Rect } from "./geometry";
import { resolveDockTarget, zoneRect } from "./geometry";

type MeasuredTab = { id: string; rect: Rect };

/** `tabs` in strip order, each rect spanning the whole tab item (label plus close button). */
type MeasuredStrip = { rect: Rect; tabs: ReadonlyArray<MeasuredTab> };

/** A tabset without a strip has no tab order to measure, so a stack drop onto it carries no index. */
type MeasuredTabset = { id: string; rect: Rect; strip: MeasuredStrip | null };

type DropIntentOptions = { splitDock?: boolean };

type DropIndicator = { kind: "insertion" | "zone"; rect: Rect };

const INSERTION_LINE_WIDTH = 4;

const pointInRect = (point: Point, rect: Rect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

/** The dragged tab leaves its slot before it lands, so indexes count only the tabs it lands among. */
const landingTabs = (subject: DragSubject, strip: MeasuredStrip): ReadonlyArray<MeasuredTab> =>
  subject.kind === "tab" ? strip.tabs.filter((tab) => tab.id !== subject.id) : strip.tabs;

const insertionIndex = (tabs: ReadonlyArray<MeasuredTab>, pointerX: number): number => {
  const found = tabs.findIndex((tab) => pointerX < tab.rect.x + tab.rect.width / 2);
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

const resolveDropIntent = (
  subject: DragSubject,
  tabset: MeasuredTabset,
  point: Point,
  options?: DropIntentOptions,
): DropIntent | null => {
  if (isSelfDrop(subject, tabset)) {
    return null;
  }
  const { strip } = tabset;
  if (strip && pointInRect(point, strip.rect)) {
    return {
      index: insertionIndex(landingTabs(subject, strip), point.x),
      location: "center",
      targetId: tabset.id,
    };
  }
  const location = options?.splitDock === false ? "center" : resolveDockTarget(point, tabset.rect);
  if (location === "center" && strip) {
    return { index: landingTabs(subject, strip).length, location, targetId: tabset.id };
  }
  return { location, targetId: tabset.id };
};

const insertionLineRect = (
  strip: MeasuredStrip,
  tabs: ReadonlyArray<MeasuredTab>,
  index: number,
): Rect => {
  const at = tabs.at(index)?.rect;
  const last = tabs.at(-1)?.rect;
  const x = at?.x ?? (last ? last.x + last.width : strip.rect.x);
  const left = x - INSERTION_LINE_WIDTH / 2;
  const { rect } = strip;
  return {
    height: rect.height,
    width: INSERTION_LINE_WIDTH,
    x: Math.max(rect.x, Math.min(left, rect.x + rect.width - INSERTION_LINE_WIDTH)),
    y: rect.y,
  };
};

/** Reads the same measurement `resolveDropIntent` did, so the line marks the slot the index names. */
const dropIndicator = (
  subject: DragSubject,
  tabset: MeasuredTabset,
  intent: DropIntent,
): DropIndicator => {
  const { strip } = tabset;
  if (intent.location === "center" && strip) {
    return {
      kind: "insertion",
      rect: insertionLineRect(strip, landingTabs(subject, strip), intent.index ?? 0),
    };
  }
  return { kind: "zone", rect: zoneRect(tabset.rect, intent.location) };
};

export { dropIndicator, resolveDropIntent };
export type { DropIndicator, DropIntentOptions, MeasuredStrip, MeasuredTab, MeasuredTabset };

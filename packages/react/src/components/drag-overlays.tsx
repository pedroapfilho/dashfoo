"use client";

import type { dragDockMachine } from "@dashfoo/core";
import { zoneRect } from "@dashfoo/core";
import { useSelector } from "@xstate/react";
import type { CSSProperties, ReactNode } from "react";
import type { ActorRefFrom } from "xstate";

import type { Zone } from "../lib/tab-insertion";
import { insertionGhostRect } from "../lib/tab-insertion";

// The drag adapter's two overlays: the dock indicator (where the drop will
// land) and the pointer-anchored preview chip. Split from drag-adapter.tsx to
// keep that module focused on wiring @dnd-kit to the drag machine.

type DragActor = ActorRefFrom<typeof dragDockMachine>;

const overlayBase: CSSProperties = {
  boxSizing: "border-box",
  pointerEvents: "none",
  position: "fixed",
  // Overridable so a theme can drop it under prefers-reduced-motion.
  transition: "var(--dashfoo-dock-transition, left 60ms, top 60ms, width 60ms, height 60ms)",
  zIndex: 9999,
};

// Only position/size are fixed inline; every visual property is an overridable
// CSS var with a neutral fallback, so a consumer's data-dashfoo="dock-indicator"
// theme fully owns the look.
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

// The insertion ghost shares the pane's fill and border but carries the tab's
// corner shape, so it reads as the tab it previews (the shipped theme rounds
// only the top corners, like its tabs).
const ghostStyle = (zone: Zone): CSSProperties => ({
  ...paneStyle(zone),
  borderRadius: "var(--dashfoo-dock-tab-radius, var(--dashfoo-dock-radius, 6px))",
});

// Whole-tab-item rects (label + close button), excluding the dragged tab. The
// insertion ghost lands on these boundaries so the "after the last tab" position
// sits past the close button, not between the label and the close.
const tabItemRects = (strip: Element, excludeId?: string): Array<DOMRect> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab-item"]')].flatMap((item) =>
    item.querySelector<HTMLElement>('[data-dashfoo="tab"]')?.dataset.tabId === excludeId
      ? []
      : [item.getBoundingClientRect()],
  );

// When the dragged source's own size is unknown (e.g. it vanished mid-drag),
// fall back to the target strip's average tab size, else a plausible default.
const FALLBACK_GHOST_SIZE = { height: 32, width: 96 };

type GhostSize = { height: number; width: number };

const ghostSize = (
  sourceSize: GhostSize | undefined,
  itemRects: ReadonlyArray<DOMRect>,
): GhostSize => {
  if (sourceSize) {
    return sourceSize;
  }
  if (itemRects.length > 0) {
    return {
      height: itemRects.reduce((sum, rect) => sum + rect.height, 0) / itemRects.length,
      width: itemRects.reduce((sum, rect) => sum + rect.width, 0) / itemRects.length,
    };
  }
  return FALLBACK_GHOST_SIZE;
};

// A "where it will land" indicator driven off the machine's live intent: a
// tab-sized ghost in the tab bar for a stack, the matching content half for a
// split. One unkeyed div, so React reuses the DOM node and the position/size
// transition morphs between the two shapes instead of remounting.
const DockIndicator = ({
  actorRef,
  getSourceSize,
  getTabsetElement,
}: {
  actorRef: DragActor;
  getSourceSize: () => GhostSize | undefined;
  getTabsetElement: (id: string) => HTMLElement | undefined;
}): ReactNode => {
  const intent = useSelector(actorRef, (snapshot) => snapshot.context.intent);
  const draggedId = useSelector(actorRef, (snapshot) => snapshot.context.subject?.id);
  if (!intent) {
    return null;
  }
  const element = getTabsetElement(intent.targetId);
  if (!element) {
    return null;
  }
  if (intent.location === "center") {
    const strip = element.querySelector('[data-dashfoo="tabstrip"]');
    if (strip) {
      const items = tabItemRects(strip, draggedId);
      const ghost = insertionGhostRect(
        strip.getBoundingClientRect(),
        items,
        intent.index ?? 0,
        ghostSize(getSourceSize(), items),
      );
      return <div data-dashfoo="dock-indicator" style={ghostStyle(ghost)} />;
    }
  }
  const zone = zoneRect(element.getBoundingClientRect(), intent.location);
  return <div data-dashfoo="dock-indicator" style={paneStyle(zone)} />;
};

const previewStyle: CSSProperties = { left: 0, position: "fixed", top: 0, zIndex: 9999 };

type DragPreviewState = { label: string; x: number; y: number };

// The pointer-anchored chip that follows the cursor while dragging.
const DragPreview = ({
  overlayRef,
  preview,
}: {
  overlayRef: (element: HTMLDivElement | null) => void;
  preview: DragPreviewState | null;
}): ReactNode => {
  if (!preview) {
    return null;
  }
  return (
    <div
      data-dashfoo="drag-preview"
      ref={overlayRef}
      style={{ ...previewStyle, transform: `translate(${preview.x}px, ${preview.y}px)` }}
    >
      {preview.label}
    </div>
  );
};

export { DockIndicator, DragPreview };
export type { DragPreviewState, GhostSize };

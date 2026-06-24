"use client";

import type { dragDockMachine } from "@dashfoo/core";
import { zoneRect } from "@dashfoo/core";
import { useSelector } from "@xstate/react";
import type { CSSProperties, ReactNode } from "react";
import type { ActorRefFrom } from "xstate";

import type { Zone } from "../lib/tab-insertion";
import { insertionLineRect } from "../lib/tab-insertion";

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

// The insertion line shares the pane's fill and border, shrunk to a thin caret
// between tabs, so the strip indicator and the dock panes read as one family.
const lineStyle = (zone: Zone): CSSProperties => ({
  ...paneStyle(zone),
  borderRadius: "var(--dashfoo-dock-line-radius, 2px)",
});

// Whole-tab-item rects (label + close button), excluding the dragged tab. The
// insertion line lands on these boundaries so the "after the last tab" position
// sits past the close button, not between the label and the close.
const tabItemRects = (strip: Element, excludeId?: string): Array<DOMRect> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab-item"]')].flatMap((item) =>
    item.querySelector<HTMLElement>('[data-dashfoo="tab"]')?.dataset.tabId === excludeId
      ? []
      : [item.getBoundingClientRect()],
  );

// A "where it will land" indicator driven off the machine's live intent: an
// insertion line in the tab bar for a stack, the matching content half for a
// split. One unkeyed div, so React reuses the DOM node and the position/size
// transition morphs between the two shapes instead of remounting.
const DockIndicator = ({
  actorRef,
  getTabsetElement,
}: {
  actorRef: DragActor;
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
  // A docked target sits beneath the floating-panel layer, so its indicator must
  // too — otherwise the z:9999 overlay paints over a float that occludes the
  // target. A target inside a float stays above that float.
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
export type { DragPreviewState };

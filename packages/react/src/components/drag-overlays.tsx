"use client";

import type { dragDockMachine, Point } from "@dashfoo/core";
import { zoneRect } from "@dashfoo/core";
import type { DragDropManager } from "@dnd-kit/dom";
import { Feedback } from "@dnd-kit/dom";
import { useSelector } from "@xstate/react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
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

// The pointer-anchored preview chip keeps the cursor at this offset from its
// top-left corner, exactly as before the Feedback adoption.
const PREVIEW_OFFSET: Point = { x: 12, y: 8 };

const labelOf = (source: { data?: Record<string, unknown> } | null): string => {
  const raw = source?.data?.label;
  return typeof raw === "string" ? raw : "";
};

type ChipState = { label: string; x: number; y: number };

// The drag-preview chip, positioned by dnd-kit's Feedback plugin. Feedback
// anchors the wrapper to the source element's rect and drives it with the drag
// delta; the one-shot inner offset (grab point within the source, plus
// PREVIEW_OFFSET) re-anchors the chip to the pointer, preserving the
// pointer-following feel. The wrapper stays mounted for the manager's lifetime:
// Feedback's render effect runs synchronously at drag start, so `overlay` must
// already be assigned — set mid-drag, Feedback would first promote the source
// element itself, placeholder clone and all.
const DragPreviewOverlay = ({ manager }: { manager: DragDropManager }): ReactNode => {
  const [chip, setChip] = useState<ChipState | null>(null);

  useEffect(() => {
    const offStart = manager.monitor.addEventListener("dragstart", (event) => {
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
    });
    const offEnd = manager.monitor.addEventListener("dragend", () => setChip(null));
    return () => {
      offStart();
      offEnd();
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

  // data-dnd-overlay is ours to stamp (dnd-kit only references it, in the
  // injected CSS that hides the wrapper while no drag is live). popover and
  // data-dnd-dragging are Feedback-owned attributes — declaring them here would
  // fight its cleanup, which strips the attributes it added.
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
            // Absolute children shrink to the containing block, and the wrapper
            // is source-sized (a tabset grip is ~20px) — the chip sizes to its
            // own label instead.
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

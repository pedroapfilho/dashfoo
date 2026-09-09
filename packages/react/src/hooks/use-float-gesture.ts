"use client";

import type { Geometry } from "@dashfoo/core";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";

import { EDGE_BY_KEY } from "../components/float-resize-handles";
import type { ResizeEdges, Size } from "../lib/float-geometry";
import { clampToBounds, resizeRect } from "../lib/float-geometry";

const CHIP_SIZE: Size = { height: 34, width: 168 };

const TAP_SLOP = 4;

/** `moved` and `latest` live here because they only mean anything mid-gesture. */
type Gesture = {
  bounds: Size;
  edges: ResizeEdges | null;
  initialStyle: Pick<CSSProperties, "height" | "left" | "top" | "width">;
  latest: Geometry;
  moved: boolean;
  pointerId: number;
  start: Geometry;
  startX: number;
  startY: number;
};

type FloatGestureOptions = {
  editable: boolean;
  geometry: Geometry;
  minimized: boolean;
  onCommit: (geometry: Geometry) => void;
  onTap: () => void;
};

type FloatGestureHandlers = {
  onPointerCancel: (event: ReactPointerEvent) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
};

type FloatGesture = {
  handlers: FloatGestureHandlers;
  ref: (element: HTMLElement | null) => void;
  style: CSSProperties;
};

/** Writes inline style and dispatches only on pointer-up: routing every move
 * through the model would re-render the whole tree behind the float. */
const useFloatGesture = ({
  editable,
  geometry,
  minimized,
  onCommit,
  onTap,
}: FloatGestureOptions): FloatGesture => {
  const panelRef = useRef<HTMLElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);

  const setPanel = (element: HTMLElement | null): void => {
    panelRef.current = element;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    const panel = panelRef.current;

    if (!panel || !editable) {
      return;
    }

    const prior = gestureRef.current;
    if (prior && panel.hasPointerCapture?.(prior.pointerId)) {
      panel.releasePointerCapture(prior.pointerId);
    }
    const edgeKey = event.currentTarget.dataset.edge;

    const parent = panel.offsetParent instanceof HTMLElement ? panel.offsetParent : null;
    const rect = panel.getBoundingClientRect();
    const visibleGeometry = {
      height: minimized ? geometry.height : rect.height,
      left: rect.left,
      top: rect.top,
      width: minimized ? geometry.width : rect.width,
    };
    const gesture: Gesture = {
      bounds: { height: parent?.clientHeight ?? 0, width: parent?.clientWidth ?? 0 },
      edges: edgeKey === undefined ? null : (EDGE_BY_KEY.get(edgeKey) ?? null),
      initialStyle: {
        height: panel.style.height,
        left: panel.style.left,
        top: panel.style.top,
        width: panel.style.width,
      },
      latest: visibleGeometry,
      moved: false,
      pointerId: event.pointerId,
      start: visibleGeometry,
      startX: event.clientX,
      startY: event.clientY,
    };
    gestureRef.current = gesture;

    if (gesture.edges) {
      panel.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) {
      return;
    }
    gestureRef.current = null;

    const panel = panelRef.current;
    if (panel?.hasPointerCapture?.(event.pointerId) === true) {
      panel.releasePointerCapture(event.pointerId);
    }

    if (!gesture.moved) {
      onTap();
      return;
    }
    onCommit(gesture.latest);
  };

  const handlePointerMove = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    const panel = panelRef.current;
    if (!gesture || !panel || event.pointerId !== gesture.pointerId) {
      return;
    }

    if (event.buttons === 0) {
      handlePointerUp(event);
      return;
    }
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.moved) {
      if (Math.hypot(dx, dy) <= TAP_SLOP) {
        return;
      }
      gesture.moved = true;

      if (!gesture.edges) {
        panel.setPointerCapture(gesture.pointerId);
      }
    }
    const next = gesture.edges
      ? resizeRect(gesture.start, gesture.edges, dx, dy)
      : clampToBounds(
          { ...gesture.start, left: gesture.start.left + dx, top: gesture.start.top + dy },
          gesture.bounds,
          minimized ? CHIP_SIZE : undefined,
        );

    gesture.latest = next;
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;

    if (!minimized) {
      panel.style.width = `${next.width}px`;
      panel.style.height = `${next.height}px`;
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    const panel = panelRef.current;
    if (!gesture || !panel || event.pointerId !== gesture.pointerId) {
      return;
    }
    gestureRef.current = null;
    if (panel.hasPointerCapture?.(event.pointerId)) {
      panel.releasePointerCapture(event.pointerId);
    }
    if (!gesture.moved) {
      return;
    }
    Object.assign(panel.style, gesture.initialStyle);
  };

  return {
    handlers: {
      onPointerCancel: handlePointerCancel,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
    ref: setPanel,
    // CSS projects saved desktop geometry into the current viewport without
    // a resize effect, hydration divergence, storage write or history entry.
    style: {
      height: minimized ? undefined : `min(${geometry.height}px, 100dvh)`,
      left: `clamp(0px, ${geometry.left}px, calc(100vw - min(${minimized ? CHIP_SIZE.width : geometry.width}px, 100vw)))`,
      top: `clamp(0px, ${geometry.top}px, calc(100dvh - min(${minimized ? CHIP_SIZE.height : geometry.height}px, 100dvh)))`,
      width: minimized ? undefined : `min(${geometry.width}px, 100vw)`,
    },
  };
};

export { useFloatGesture };
export type { FloatGesture, FloatGestureOptions };
